import express, { Request, Response } from "express";
import { exec } from "child_process";
import cors from "cors";
import { promisify } from "util";

const app = express();
const port = 3001;
const execAsync = promisify(exec);

// Define types
type PortInfo = {
  port: number;
  protocol: string;
  state: string;
  service: string;
};

type NmapResult = {
  ports: PortInfo[];
  scanTime: string;
};

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000", // Update this if you are using a different frontend port
  })
);
app.use(express.json()); // Middleware to handle JSON request bodies

// Validate the target IP/domain
function isValidTarget(target: string): boolean {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const domainRegex =
    /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
  return ipRegex.test(target) || domainRegex.test(target);
}

// Parse the Nmap output into a structured format
function parseNmapOutput(output: string): NmapResult {
  const ports: PortInfo[] = [];
  let scanTime = "";

  output.split("\n").forEach((line) => {
    const portMatch = line.match(/^(\d+)\/(tcp|udp)\s+(\w+)\s+(\w+)/);
    if (portMatch) {
      ports.push({
        port: parseInt(portMatch[1]),
        protocol: portMatch[2],
        state: portMatch[3].toLowerCase(),
        service: portMatch[4],
      });
    }

    const timeMatch = line.match(/scanned in (.+)$/);
    if (timeMatch) scanTime = timeMatch[1];
  });

  return { ports, scanTime };
}

// Scan endpoint
app.post("/scan", async (req: Request, res: Response) => {
  const { target } = req.body;

  // Check if the target is valid
  if (!target || !isValidTarget(target)) {
    return res.status(400).json({ error: "Invalid target" });
  }

  try {
    console.log(`Starting scan for target: ${target}`);

    // Execute the nmap scan command
    const { stdout, stderr } = await execAsync(`nmap -T4 -F ${target}`);

    if (stderr) {
      console.error(`Error with Nmap execution: ${stderr}`);
      throw new Error(stderr);
    }

    const result = parseNmapOutput(stdout);

    // Log the result for debugging
    console.log("Scan completed successfully. Ports found:", result.ports);

    res.json({
      target,
      ports: result.ports,
      scanTime: result.scanTime || "unknown",
    });
  } catch (error) {
    // Detailed error handling
    console.error("Scan error:", error);
    res.status(500).json({
      error: "Scan failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
