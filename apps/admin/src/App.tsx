import { createEntry } from "@static-cms/core";

const entry = createEntry("Hello from Static CMS");

export function App() {
  return (
    <main>
      <h1>{entry.title}</h1>
      <p>
        Slug: <code>{entry.slug}</code>
      </p>
    </main>
  );
}
