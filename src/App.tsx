import logo from "./assets/youware-bg.png";
import { WordTable } from "./components/WordTable";
import { UploadPanel } from "./components/UploadPanel";

function App() {

  return (
    <main
      className="min-h-screen bg-[#F6F4F1] bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${logo})`,
      }}
    >
      <div className="min-h-screen bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex min-h-screen max-w-8xl flex-col px-6 py-12 lg:px-16">
          <header className="mb-10">
            <h1 className="text-4xl font-semibold text-neutral-900">
              Turkish ↔ Arabic Vocabulary Studio
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-500">
              Curate bilingual vocabulary, manage thematic categories, and maintain difficulty metadata for learners.
            </p>
          </header>

          <UploadPanel selectedCategoryId={null} />
          <div className="flex flex-1 flex-col">
            <WordTable selectedCategoryId={null} />
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
