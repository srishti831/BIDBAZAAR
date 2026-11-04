import React from "react";
import { Link } from "react-router-dom";
import { Page } from "@/custom-components/Page";

const NotFound = () => (
  <Page narrow className="grid min-h-[60vh] place-items-center text-center">
    <div>
      <p className="font-display text-8xl font-extrabold text-bid">404</p>
      <h1 className="mt-2 text-2xl font-bold">This page has been sold</h1>
      <p className="mt-2 text-dim">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="btn-primary mt-6">Back to home</Link>
    </div>
  </Page>
);

export default NotFound;
