import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Upload, FileText, Image as ImageIcon, Folder, MoreVertical, Database, Archive, FileCode } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

interface FileRecord {
  id: string;
  name: string;
  type: string;
  size: string;
  updated_at: string;
  owner_name: string;
}

export function Files() {
  const { isAuthReady, user } = useAuth();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isAuthReady || !user) return;

    async function fetchFiles() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('files')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setFiles(data || []);
      } catch (error) {
        console.error("Error fetching files from Supabase:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchFiles();
  }, [isAuthReady, user]);

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'folder': return <Folder className="h-4 w-4 text-primary/70 fill-primary/10" />;
      case 'pdf': return <FileText className="h-4 w-4 text-destructive/70" />;
      case 'image': return <ImageIcon className="h-4 w-4 text-success/70" />;
      case 'archive': return <Archive className="h-4 w-4 text-warning/70" />;
      case 'code': return <FileCode className="h-4 w-4 text-primary/70" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground/70" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Documents & Files</h1>
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase">
            <Database className="h-3 w-3 text-success" />
            Authority: Supabase_Truth
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 font-mono uppercase text-[10px] border-white/10"
            aria-label="Create new folder"
            disabled
            title="Folder creation is disabled until storage authority is selected."
          >
            <Folder className="mr-2 h-3.5 w-3.5" />
            Folder locked
          </Button>
          <Button
            size="sm"
            className="h-9 font-mono uppercase text-[10px] tracking-wider"
            disabled
            title="Uploads are disabled until file storage and audit logging are connected."
          >
            <Upload className="mr-2 h-3.5 w-3.5" />
            Upload locked
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden glass border-white/5">
        <div className="p-4 border-b border-white/5 flex items-center gap-4 bg-black/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="SEARCH_BY_NAME_OR_ID..." 
              className="pl-10 bg-black/20 border-white/5 font-mono text-[10px] uppercase tracking-wider h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search files"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-black/40 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">File_Name</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Size</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Modified</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Owner</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest">Initialising_File_Stream...</TableCell>
                </TableRow>
              ) : filteredFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest">No_Records_Found</TableCell>
                </TableRow>
              ) : filteredFiles.map((file) => (
                <TableRow key={file.id} className="group hover:bg-white/5 border-white/5 transition-colors">
                  <TableCell>
                    {getFileIcon(file.type)}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{file.name}</TableCell>
                  <TableCell className="text-[10px] font-mono text-muted-foreground uppercase">{file.size}</TableCell>
                  <TableCell className="text-[10px] font-mono text-muted-foreground uppercase">
                    {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(file.updated_at))}
                  </TableCell>
                  <TableCell className="text-[10px] font-mono text-muted-foreground uppercase">{file.owner_name}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Actions for ${file.name}`}
                      disabled
                      title="File actions are disabled until storage authority is selected."
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
