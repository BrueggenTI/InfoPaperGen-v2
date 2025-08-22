// server/production.ts

import express, { type Express } from "express";
import fs from "fs";
import path from "path";

// Diese Log-Funktion ist sicher für die Produktion.
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Diese Funktion zum Ausliefern statischer Dateien ist sicher für die Produktion.
export function serveStatic(app: Express) {
  // Wichtig: Der Pfad muss vom kompilierten 'dist'-Verzeichnis aus gehen.
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    const errorMsg = `Could not find the build directory: ${distPath}, make sure to build the client first`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  app.use(express.static(distPath));

  // Alle nicht gefundenen Routen an die index.html weiterleiten.
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
