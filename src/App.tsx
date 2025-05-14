import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import Upload from "./pages/Upload";
import Profile from "./pages/Profile";
import SampleDetail from "./pages/SampleDetail";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1a1a1a",
            color: "#f5f5f5",
            border: "1px solid #222",
          },
          success: {
            iconTheme: { primary: "#facc15", secondary: "#000" },
          },
        }}
      />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/sample/:id" element={<SampleDetail />} />
        <Route path="*" element={
          <main style={{ textAlign: "center", paddingTop: "80px", color: "var(--text-secondary)" }}>
            <h1 style={{ fontSize: "48px", fontWeight: 800 }}>404</h1>
            <p>Page not found.</p>
          </main>
        } />
      </Routes>
    </BrowserRouter>
  );
}
