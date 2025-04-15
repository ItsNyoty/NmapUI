import express, { Request, Response } from "express";
import { exec } from "child_process";
import cors from "cors";
import { promisify } from "util";
import axios from "axios"; // To fetch geolocation

const app = express();
const port = 3001;
const execAsync = promisify(exec);

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

type Geolocation = {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
};

app.use(
  cors({
    origin: "http://localhost:3000",
  })
);
app.use(express.json());

function isValidTarget(target: string): boolean {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const domainRegex =
    /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
  return ipRegex.test(target) || domainRegex.test(target);
}

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

async function getGeolocation(target: string): Promise<Geolocation | null> {
  try {
    const response = await axios.get(`https://ipinfo.io/${target}/json`);
    const { country, region, city, loc } = response.data;
    const [latitude, longitude] = loc ? loc.split(",") : ["0", "0"];
    return {
      country,
      region,
      city,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    };
  } catch (error) {
    console.error("Error fetching geolocation:", error);
    return null;
  }
}

app.post("/scan", async (req: Request, res: Response) => {
  const { target, scanType } = req.body;

  if (!target || !isValidTarget(target)) {
    return res.status(400).json({ error: "Invalid target" });
  }

  try {
    console.log(
      `Starting scan for target: ${target} (type: ${scanType || "quick"})`
    );

    let nmapCommand = `nmap -T4 -F ${target}`; // Default to quick scan
    if (scanType === "full") {
      nmapCommand = `nmap -T4 -p- ${target}`; // Full port range
    }

    const { stdout, stderr } = await execAsync(nmapCommand);

    if (stderr) {
      console.error(`Error with Nmap execution: ${stderr}`);
      throw new Error(stderr);
    }

    const result = parseNmapOutput(stdout);
    const geolocation = await getGeolocation(target);

    console.log("Scan completed successfully. Ports found:", result.ports);

    res.json({
      target,
      ports: result.ports,
      scanTime: result.scanTime || "unknown",
      geolocation: geolocation || "Geolocation not available",
    });
  } catch (error) {
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
