"use client";
import Image from "next/image";
import { FaBars } from "react-icons/fa";
import NavPage from "@/components/navPage";
import { useState } from "react";


export default function Home() {
  const [ showNav, setShowNav ] = useState(false);

  return (
    <div>
      
      <div className="bg-blue-200 h-screen">
        <div id="navBar" className="flex justify-between p-4 bg-blue-600">
          <a href="/">
            <h1 className="text-2xl">Debtflix</h1>
          </a>
          <button onClick={() => setShowNav(prev => !prev)}>
            <FaBars className="text-2xl" />
          </button>
        </div>
      </div>
      {showNav && (
        <NavPage hideNavMenu={() => setShowNav(false)} />
      )}

    </div>
  );
}
