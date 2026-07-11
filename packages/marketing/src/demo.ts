import { StubMarketingDrafter } from "./stub.js";

/** Draft a newsletter from a stub story (local demo, no credentials). */
async function main(): Promise<void> {
  const drafter = new StubMarketingDrafter();
  const draft = await drafter.draftNewsletter({
    kind: "notes",
    value: "spring market update — inventory shifting, townhouse demand strong",
  });

  console.log(`[marketing] Draft status: ${draft.status}`);
  console.log(`Headline: ${draft.headline}`);
  console.log(`Word count: ${draft.wordCount}`);
  console.log("---");
  console.log(draft.body);
  console.log("---");
  console.log("Editor notes:");
  for (const note of draft.editorNotes) {
    console.log(`  • ${note}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
