import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Counter } from "../target/types/counter";

describe("Counter Contract", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Counter as Program<Counter>;

    let counterAccountPubkey;

    it("Initialize count", async () => {
        const counterAccountKeyPair = anchor.web3.Keypair.generate();
        
        await program.methods
            .initialize()
            .accounts({
                counterAccount: counterAccountKeyPair.publicKey,
                user: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([counterAccountKeyPair])
            .rpc();

        counterAccountPubkey = counterAccountKeyPair.publicKey;

        const account = await program.account.counterAccount.fetch(
            counterAccountPubkey
        );

        console.log("Initial count: ", account.count.toString());
    });

    it("Increment count", async () => {
        await program.methods
            .increment()
            .accounts({
                counterAccount: counterAccountPubkey,
            })
            .rpc();

        const account = await program.account.counterAccount.fetch(
            counterAccountPubkey
        );

        console.log("Current count: ", account.count.toString());
    });

});