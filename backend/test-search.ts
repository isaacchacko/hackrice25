// backend/test-search.ts (CommonJS style)
const { search } = require("./search");

// Local type to satisfy TS without ESM imports
type Page = { url: string; title?: string; snippet?: string };

async function main() {
  const query = process.argv.slice(2).join(" ");
  if (!query) {
    console.error("Usage: node backend/test-search-launch.cjs <your question>");
    process.exit(1);
  }

  try {
    const pages: Page[] = await search(query, { limit: 5 });
    console.log("Search results:\n");
    pages.forEach((p: Page, i: number) => {
      console.log(`${i + 1}. ${p.title ?? "(no title)"}`);
      console.log(`   ${p.url}`);
      if (p.snippet) console.log(`   ${p.snippet}`);
      console.log();
    });
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
