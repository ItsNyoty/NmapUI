import { useState, useRef, useEffect } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "./components/ui/card";
import {
  Loader2,
  Shield,
  Check,
  X,
  Scan,
  Zap,
  Server,
  Network,
  Clock,
  History,
  FileDown,
  Trash2,
} from "lucide-react";

const html2pdf = require("html2pdf.js");

type PortResult = {
  port: number;
  service: string;
  state: "open" | "closed" | "filtered";
};

type Geolocation = {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
};

type ScanResult = {
  target: string;
  ports: PortResult[];
  scanTime: string;
  geolocation: Geolocation | string;
};

export default function NmapScanner() {
  const [target, setTarget] = useState("");
  const [scanType, setScanType] = useState("quick"); // Scan type state (quick/full)
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("scanHistory");
    if (stored) {
      setHistory(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("scanHistory", JSON.stringify(history));
  }, [history]);

  const handleScan = async () => {
    if (!target.trim()) {
      setError("Please enter a target");
      return;
    }

    setError("");
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://localhost:3001/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: target.trim(), scanType }), // Include scan type
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Scan failed");
      }

      const data = await response.json();
      const formatted: ScanResult = {
        target: data.target,
        ports: data.ports.map((p: any) => ({
          port: p.port,
          service: p.service,
          state: p.state,
        })),
        scanTime: data.scanTime,
        geolocation: data.geolocation,
      };

      setResult(formatted);
      setHistory((prev) => [formatted, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-2xl rounded-xl bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-indigo-600/20">
                <Shield className="h-8 w-8 text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-white">
                  Network Scanner
                </CardTitle>
                <p className="text-sm text-gray-400">
                  Powered by Nmap technology
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <Label htmlFor="target" className="text-gray-300 font-medium">
                  Target Host
                </Label>
                <div className="flex space-x-3 mt-2">
                  <Input
                    id="target"
                    placeholder="e.g. 192.168.1.1 or example.com"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    disabled={isLoading}
                    className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Button
                    onClick={handleScan}
                    disabled={isLoading || !target.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Scan className="mr-2 h-5 w-5" />
                    )}
                    {isLoading ? "Scanning" : "Start Scan"}
                  </Button>
                </div>

                <div className="mt-2">
                  <select
                    value={scanType}
                    onChange={(e) => setScanType(e.target.value)}
                    className="bg-gray-700 text-white border-gray-600 p-2 rounded-lg w-full"
                    disabled={isLoading}
                  >
                    <option value="quick">Quick Scan</option>
                    <option value="full">Full Scan</option>
                  </select>
                </div>

                {error && (
                  <div className="mt-2 p-2 bg-red-900/30 text-red-300 rounded flex items-center">
                    <X className="h-4 w-4 mr-2" />
                    {error}
                  </div>
                )}
              </div>

              {result && (
                <div className="space-y-4" ref={resultRef}>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white flex items-center">
                          <Server className="h-5 w-5 mr-2 text-indigo-400" />
                          Scan Results
                        </h3>
                        <p className="text-sm text-gray-400">
                          Target:{" "}
                          <span className="text-indigo-300">
                            {result.target}
                          </span>
                        </p>
                      </div>
                      <div className="bg-gray-600/50 px-3 py-1 rounded-full text-xs text-gray-300 flex items-center">
                        <Clock className="h-3 w-3 mr-1" /> {result.scanTime}
                      </div>
                    </div>
                  </div>

                  {result.geolocation &&
                    typeof result.geolocation === "object" && (
                      <div className="bg-gray-700/50 p-4 rounded-lg">
                        <h4 className="text-md font-semibold text-white">
                          Geolocation
                        </h4>
                        <p className="text-sm text-gray-400">
                          Country: {result.geolocation.country}
                        </p>
                        <p className="text-sm text-gray-400">
                          Region: {result.geolocation.region}
                        </p>
                        <p className="text-sm text-gray-400">
                          City: {result.geolocation.city}
                        </p>
                        <p className="text-sm text-gray-400">
                          Latitude: {result.geolocation.latitude}
                        </p>
                        <p className="text-sm text-gray-400">
                          Longitude: {result.geolocation.longitude}
                        </p>
                      </div>
                    )}

                  <div className="overflow-hidden rounded-lg border border-gray-700 shadow-lg">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            <div className="flex items-center">
                              <Network className="h-4 w-4 mr-2" /> Port
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Service
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {result.ports.map((port) => (
                          <tr
                            key={port.port}
                            className="hover:bg-gray-700/50 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-900/30 flex items-center justify-center">
                                  <span className="text-indigo-300 font-mono">
                                    {port.port}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200 font-medium">
                              {port.service}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {port.state === "open" ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-300">
                                  <Check className="h-3 w-3 mr-1" /> Open
                                </span>
                              ) : port.state === "closed" ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-300">
                                  <X className="h-3 w-3 mr-1" /> Closed
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-300">
                                  Filtered
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {history.length > 0 && (
                <div className="bg-gray-700/40 p-4 rounded-lg mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white text-lg font-semibold flex items-center">
                      <History className="h-5 w-5 mr-2" /> Scan History
                    </h3>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-xs px-3 py-1"
                      onClick={() => {
                        setHistory([]);
                        localStorage.removeItem("scanHistory");
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Clear
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {history.map((scan, index) => (
                      <li
                        key={index}
                        className="flex justify-between items-center bg-gray-800 rounded-md p-2 hover:bg-gray-700"
                      >
                        <div>
                          <span className="font-medium text-white">
                            {scan.target}
                          </span>
                          <p className="text-xs text-gray-400">
                            {scan.scanTime}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-indigo-400">
                            {scan.ports.length} ports
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
