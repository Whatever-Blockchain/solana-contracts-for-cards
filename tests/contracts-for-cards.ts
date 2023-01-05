import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { ContractsForCards } from "../target/types/contracts_for_cards";

describe("contracts-for-cards", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ContractsForCards as Program<ContractsForCards>;

  it("is Initialized", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
