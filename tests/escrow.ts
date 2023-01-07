import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Escrow } from "../target/types/escrow";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  Connection,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("escrow contract", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Escrow as Program<Escrow>;

  let mintA = null;
  let mintB = null;
  let initializerTokenAccountA = null;
  let initializerTokenAccountB = null;
  let takerTokenAccountA = null;
  let takerTokenAccountB = null;
  let vault_account_pda = null;
  let vault_account_bump = null;
  let vault_authority_pda = null;

  const takerAmount = 500;
  const initializerAmount = 500;

  const payer = provider.wallet as anchor.Wallet; // escrow_program 주인
  const initializerMainAccount = anchor.web3.Keypair.generate(); // A 토큰 사용자
  const takerMainAccount = anchor.web3.Keypair.generate(); // B 토큰 사용자

  const escrowAccount = anchor.web3.Keypair.generate();
  const mintAuthority = anchor.web3.Keypair.generate();

  // Initialize Escrow Program State
  it("Initialize program state", async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(payer.publicKey, 10000000000),
      "confirmed"
    );
    console.log(
      "payer's balance after airdrop : ",
      provider.connection.getBalance(payer.publicKey)
    );

    // 1. AirDrop 1 SOL to Initializer's and Taker's Main Account
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: initializerMainAccount.publicKey,
        lamports: 1000000000,
      }),
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: takerMainAccount.publicKey,
        lamports: 1000000000,
      })
    );

    await anchor.web3.sendAndConfirmTransaction(
      provider.connection,
      transaction,
      [payer.payer]
    );
    console.log(
      "payer's balance : ",
      provider.connection.getBalance(payer.publicKey)
    );
    console.log(
      "initializerMainAccount's balance : ",
      provider.connection.getBalance(initializerMainAccount.publicKey)
    );
    console.log(
      "takerMainAccount's balance : ",
      provider.connection.getBalance(takerMainAccount.publicKey)
    );

    // 2. create mintA and mintB
    mintA = await createMint(
      provider.connection,
      payer.payer,
      mintAuthority.publicKey,
      null,
      0
    );
    console.log("mintA's pubkey : ", mintA);

    mintB = await createMint(
      provider.connection,
      payer.payer,
      mintAuthority.publicKey,
      null,
      0
    );
    console.log("mintB's pubkey : ", mintB);

    // 3. Create initializer's and taker's Token Account A,B
    initializerTokenAccountA = await createAccount(
      provider.connection,
      initializerMainAccount,
      mintA,
      initializerMainAccount.publicKey
    );
    takerTokenAccountA = await createAccount(
      provider.connection,
      takerMainAccount,
      mintA,
      takerMainAccount.publicKey
    );
    initializerTokenAccountB = await createAccount(
      provider.connection,
      initializerMainAccount,
      mintB,
      initializerMainAccount.publicKey
    );
    takerTokenAccountB = await createAccount(
      provider.connection,
      takerMainAccount,
      mintB,
      takerMainAccount.publicKey
    );

    // 4. MintA to InitializerTokenAccountA and MintB to TakerTokenAccountB
    await mintTo(
      provider.connection,
      initializerMainAccount,
      mintA,
      initializerTokenAccountA,
      mintAuthority, // pubkey 로 하니까 error 남.
      initializerAmount
    );

    await mintTo(
      provider.connection,
      takerMainAccount,
      mintB,
      takerTokenAccountB,
      mintAuthority,
      takerAmount
    );

    // let _initializerTokenAccountA = await provider.connection.getAccountInfo(initializerTokenAccountA);
    let _initializerTokenAccountA = await getAccount(
      provider.connection,
      initializerTokenAccountA
    );

    // let _takerTokenAccountB = await provider.connection.getAccountInfo(takerTokenAccountB);
    let _takerTokenAccountB = await getAccount(
      provider.connection,
      takerTokenAccountB
    );

    console.log(
      "_initializerTokenAccountA lamports : ",
      _initializerTokenAccountA.amount.toString()
    );
    console.log(
      "_takerTokenAccountB lamports : ",
      _takerTokenAccountB.amount.toString()
    );
  });

  it("Initialize escrow", async () => {
    const [_vault_account_pda, _vault_account_bump] =
      await PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("token-seed"))],
        program.programId
      );
    vault_account_pda = _vault_account_pda;
    vault_account_bump = _vault_account_bump;

    const [_vault_authority_pda, _vault_authority_bump] =
      await PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("escrow"))],
        program.programId
      );
    vault_authority_pda = _vault_authority_pda;

    console.log("escrowAccount : " + escrowAccount.publicKey.toString());
    await program.methods
      .initialize(
        vault_account_bump,
        new anchor.BN(initializerAmount),
        new anchor.BN(takerAmount)
      )
      .accounts({
        initializer: initializerMainAccount.publicKey,
        mint: mintA,
        vaultAccount: vault_account_pda,
        initializerDepositTokenAccount: initializerTokenAccountA,
        initializerReceiveTokenAccount: initializerTokenAccountB,
        escrowAccount: escrowAccount.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions([
        await program.account.escrowAccount.createInstruction(escrowAccount),
      ])
      .signers([escrowAccount, initializerMainAccount])
      .rpc();

    let _vault = await getAccount(provider.connection, vault_account_pda);

    let _escrowAccount = await program.account.escrowAccount.fetch(
      escrowAccount.publicKey
    );

    assert.ok(_vault.owner.equals(vault_authority_pda));

    assert.ok(
      _escrowAccount.initializerKey.equals(initializerMainAccount.publicKey)
    );
    assert.ok(_escrowAccount.initializerAmount.toNumber() == initializerAmount);
    assert.ok(_escrowAccount.takerAmount.toNumber() == takerAmount);
    assert.ok(
      _escrowAccount.initializerDepositTokenAccount.equals(
        initializerTokenAccountA
      )
    );
    assert.ok(
      _escrowAccount.initializerReceiveTokenAccount.equals(
        initializerTokenAccountB
      )
    );
  });

  it("Exchange escrow state", async () => {
    await program.methods
      .exchange()
      .accounts({
        taker: takerMainAccount.publicKey,
        takerDepositTokenAccount: takerTokenAccountB,
        takerReceiveTokenAccount: takerTokenAccountA,
        initializerDepositTokenAccount: initializerTokenAccountA,
        initializerReceiveTokenAccount: initializerTokenAccountB,
        initializer: initializerMainAccount.publicKey,
        escrowAccount: escrowAccount.publicKey,
        vaultAccount: vault_account_pda,
        vaultAuthority: vault_authority_pda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([takerMainAccount])
      .rpc();

    let _takerTokenAccountA = await getAccount(
      provider.connection,
      takerTokenAccountA
    );
    let _takerTokenAccountB = await getAccount(
      provider.connection,
      takerTokenAccountB
    );
    let _initializerTokenAccountA = await getAccount(
      provider.connection,
      initializerTokenAccountA
    );
    let _initializerTokenAccountB = await getAccount(
      provider.connection,
      initializerTokenAccountB
    );

    assert.ok(Number(_takerTokenAccountA.amount) == initializerAmount);
    assert.ok(Number(_initializerTokenAccountA.amount) == 0);
    assert.ok(Number(_initializerTokenAccountB.amount) == takerAmount);
    assert.ok(Number(_takerTokenAccountB.amount) == 0);
  });

  it("Initialize escrow and cancel escrow", async () => {
    await mintTo(
      provider.connection,
      initializerMainAccount,
      mintA,
      initializerTokenAccountA,
      mintAuthority, // pubkey 로 하니까 error 남.
      initializerAmount
    );

    await program.methods
      .initialize(
        vault_account_bump,
        new anchor.BN(initializerAmount),
        new anchor.BN(takerAmount)
      )
      .accounts({
        initializer: initializerMainAccount.publicKey,
        mint: mintA,
        vaultAccount: vault_account_pda,
        initializerDepositTokenAccount: initializerTokenAccountA,
        initializerReceiveTokenAccount: initializerTokenAccountB,
        escrowAccount: escrowAccount.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions([
        await program.account.escrowAccount.createInstruction(escrowAccount),
      ])
      .signers([escrowAccount, initializerMainAccount])
      .rpc();

    await program.methods
      .cancel()
      .accounts({
        initializer: initializerMainAccount.publicKey,
        initializerDepositTokenAccount: initializerTokenAccountA,
        vaultAccount: vault_account_pda,
        vaultAuthority: vault_authority_pda,
        escrowAccount: escrowAccount.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([initializerMainAccount])
      .rpc();

    // Check the final owner should be the provider public key.
    const _initializerTokenAccountA = await getAccount(
      provider.connection,
      initializerTokenAccountA
    );
    assert.ok(
      _initializerTokenAccountA.owner.equals(initializerMainAccount.publicKey)
    );

    // Check all the funds are still there.
    assert.ok(Number(_initializerTokenAccountA.amount) == initializerAmount);
  });
});
