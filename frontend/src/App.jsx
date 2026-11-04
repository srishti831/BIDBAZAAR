import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useDispatch } from "react-redux";
import { fetchLeaderboard, fetchUser } from "./store/slices/userSlice";
import { getAllAuctionItems } from "./store/slices/auctionSlice";
import Navbar from "./layout/Navbar";
import LiveTicker from "./layout/LiveTicker";
import Footer from "./layout/Footer";
import ProtectedRoute from "./custom-components/ProtectedRoute";
import Home from "./pages/Home";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import HowItWorks from "./pages/HowItWorks";
import About from "./pages/About";
import Leaderboard from "./pages/Leaderboard";
import Auctions from "./pages/Auctions";
import AuctionItem from "./pages/AuctionItem";
import CreateAuction from "./pages/CreateAuction";
import ViewMyAuctions from "./pages/ViewMyAuctions";
import MyBids from "./pages/MyBids";
import Watchlist from "./pages/Watchlist";
import SubmitCommission from "./pages/SubmitCommission";
import Dashboard from "./pages/Dashboard/Dashboard";
import Contact from "./pages/Contact";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Old links (/auction/details/:id) now land on the single auction page.
const LegacyDetailsRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/auction/item/${id}`} replace />;
};

const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchUser());
    dispatch(getAllAuctionItems());
    dispatch(fetchLeaderboard());
    // Keep prices and countdowns fresh while the tab is open.
    const refresh = setInterval(() => {
      if (!document.hidden) dispatch(getAllAuctionItems({ silent: true }));
    }, 20000);
    return () => clearInterval(refresh);
  }, [dispatch]);

  const member = ["User"];

  return (
    <Router>
      <ScrollToTop />
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <LiveTicker />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/how-it-works-info" element={<HowItWorks />} />
            <Route path="/about" element={<About />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/auctions" element={<Auctions />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auction/item/:id" element={<AuctionItem />} />
            <Route path="/auction/details/:id" element={<LegacyDetailsRedirect />} />

            <Route path="/create-auction" element={<ProtectedRoute roles={member}><CreateAuction /></ProtectedRoute>} />
            <Route path="/view-my-auctions" element={<ProtectedRoute roles={member}><ViewMyAuctions /></ProtectedRoute>} />
            <Route path="/my-bids" element={<ProtectedRoute roles={member}><MyBids /></ProtectedRoute>} />
            <Route path="/watchlist" element={<ProtectedRoute roles={member}><Watchlist /></ProtectedRoute>} />
            <Route path="/submit-commission" element={<ProtectedRoute roles={member}><SubmitCommission /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute roles={["Super Admin"]}><Dashboard /></ProtectedRoute>} />
            <Route path="/me" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Footer />
      </div>
      <ToastContainer position="top-right" theme="dark" newestOnTop limit={3} />
    </Router>
  );
};

export default App;
