import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Download, 
  FileText, 
  Smartphone, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "tasks" | "notes" | "passwords" | "events";
}

export function ImportExportModal({ isOpen, onClose, type }: ImportExportModalProps) {
  const [importText, setImportText] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; items: any[] } | null>(null);
  const { toast } = useToast();

  const handleTextImport = () => {
    if (!importText.trim()) return;

    let items: any[] = [];
    const lines = importText.split('\n').filter(line => line.trim());

    if (type === "tasks") {
      items = lines.map((line, index) => ({
        id: Date.now() + index,
        title: line.trim(),
        assignedTo: 1, // Default to Mom
        priority: "medium",
        dueDate: null,
        completed: false,
        createdAt: new Date()
      }));
    } else if (type === "notes") {
      items = lines.map((line, index) => ({
        id: Date.now() + index,
        content: line.trim(),
        createdBy: 1,
        createdAt: new Date()
      }));
    } else if (type === "events") {
      items = lines.map((line, index) => {
        const parts = line.split(' - ');
        return {
          id: Date.now() + index,
          title: parts[0]?.trim() || line.trim(),
          startTime: parts[1] ? new Date(parts[1].trim()) : new Date(),
          endTime: null,
          assignedTo: 1,
          createdAt: new Date()
        };
      });
    }

    setImportResults({
      success: items.length,
      failed: 0,
      items
    });

    toast({
      title: "Import Preview Ready",
      description: `Found ${items.length} items to import. Review and confirm below.`,
    });
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/csv") {
      setCsvFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0]?.split(',').map(h => h.trim());
        
        const items = lines.slice(1).filter(line => line.trim()).map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          const item: any = { id: Date.now() + index };
          
          headers?.forEach((header, i) => {
            item[header.toLowerCase()] = values[i] || "";
          });
          
          return item;
        });

        setImportResults({
          success: items.length,
          failed: 0,
          items
        });
      };
      
      reader.readAsText(file);
    }
  };

  const confirmImport = async () => {
    if (!importResults) return;

    try {
      // Here you would make API calls to actually import the data
      // For now, we'll simulate success
      toast({
        title: "Import Successful",
        description: `Successfully imported ${importResults.success} ${type}.`,
      });
      
      setImportResults(null);
      setImportText("");
      setCsvFile(null);
      onClose();
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "There was an error importing your data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportData = () => {
    // Simulate export functionality
    const sampleData = type === "tasks" 
      ? "Buy groceries\nPick up kids from school\nPlan weekend activities"
      : type === "notes"
      ? "Remember to call dentist\nGrocery list: milk, eggs, bread\nMeeting notes from PTA"
      : "Soccer practice - 2024-06-10 4:00 PM\nDoctor appointment - 2024-06-12 2:00 PM";

    navigator.clipboard.writeText(sampleData);
    toast({
      title: "Data Exported",
      description: "Your data has been copied to clipboard.",
    });
  };

  const getAppInstructions = () => {
    const instructions = {
      tasks: [
        { app: "Apple Notes", steps: "Copy tasks from your notes and paste them here (one per line)" },
        { app: "Google Keep", steps: "Export notes as text, then paste list items here" },
        { app: "Todoist", steps: "Go to Settings > Backups > Export as template, then paste task names" },
        { app: "Any.do", steps: "Copy your task list and paste here (one task per line)" }
      ],
      notes: [
        { app: "Apple Notes", steps: "Copy note content and paste directly into the text area" },
        { app: "Evernote", steps: "Export notes as text files, then copy content here" },
        { app: "Google Keep", steps: "Copy note content from each note and paste here" },
        { app: "OneNote", steps: "Copy page content and paste into the import area" }
      ],
      events: [
        { app: "Apple Calendar", steps: "Format as 'Event Name - Date Time' (one per line)" },
        { app: "Google Calendar", steps: "Export calendar, then format events as text list" },
        { app: "Outlook", steps: "Copy event details in format 'Title - Date Time'" }
      ],
      passwords: [
        { app: "1Password", steps: "Export as CSV from Settings > Export" },
        { app: "LastPass", steps: "Go to Advanced Options > Export, save as CSV" },
        { app: "Chrome", steps: "Settings > Passwords > Export passwords as CSV" },
        { app: "Safari", steps: "File > Export Passwords, save as CSV file" }
      ]
    };

    return instructions[type] || [];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={20} />
            Import/Export {type.charAt(0).toUpperCase() + type.slice(1)}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload size={16} />
              Import
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download size={16} />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Import from Other Apps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {getAppInstructions().map((instruction, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Smartphone size={16} className="mt-1 flex-shrink-0" />
                      <div>
                        <Badge variant="outline" className="mb-2">{instruction.app}</Badge>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{instruction.steps}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="import-text">Paste your {type} here (one per line):</Label>
                  <Textarea
                    id="import-text"
                    placeholder={`Example:\n${type === "tasks" ? "Buy groceries\nCall dentist\nPlan vacation" : 
                      type === "notes" ? "Remember to pick up dry cleaning\nGrocery list: milk, eggs, bread" :
                      "Soccer practice - 2024-06-10 4:00 PM\nDoctor appointment - 2024-06-12 2:00 PM"}`}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={6}
                  />
                  <Button onClick={handleTextImport} disabled={!importText.trim()}>
                    Preview Import
                  </Button>
                </div>

                {type === "passwords" && (
                  <div className="space-y-3">
                    <Label htmlFor="csv-upload">Or upload CSV file:</Label>
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                    />
                  </div>
                )}

                {importResults && (
                  <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle size={20} className="text-green-600" />
                        <span className="font-semibold">Import Preview</span>
                      </div>
                      <p className="text-sm mb-3">
                        Ready to import {importResults.success} {type}
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-1 mb-3">
                        {importResults.items.slice(0, 5).map((item, index) => (
                          <div key={index} className="text-xs bg-white dark:bg-gray-800 p-2 rounded">
                            {item.title || item.content || JSON.stringify(item).slice(0, 50)}...
                          </div>
                        ))}
                        {importResults.items.length > 5 && (
                          <div className="text-xs text-gray-500">
                            ... and {importResults.items.length - 5} more
                          </div>
                        )}
                      </div>
                      <Button onClick={confirmImport} className="w-full">
                        Confirm Import
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Your {type.charAt(0).toUpperCase() + type.slice(1)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Export your {type} to use in other apps or as a backup.
                </p>
                
                <div className="flex gap-2">
                  <Button onClick={exportData} variant="outline" className="flex items-center gap-2">
                    <Copy size={16} />
                    Copy to Clipboard
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download size={16} />
                    Download CSV
                  </Button>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-blue-600 mt-1 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold mb-1">Backup Tip</p>
                      <p className="text-blue-700 dark:text-blue-300">
                        Regular exports help keep your data safe. Consider exporting weekly as a backup.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}