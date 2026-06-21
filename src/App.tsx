import Navbar from "./components/Navbar";
import ScrollExperience from "./components/ScrollExperience";
import Features from "./components/Features";
import Reserve from "./components/Reserve";
import Footer from "./components/Footer";

export default function App() {
  return (
    <>
      <Navbar />
      <main id="top">
        <div id="reveal">
          <ScrollExperience />
        </div>
        <Features />
        <Reserve />
      </main>
      <Footer />
    </>
  );
}
