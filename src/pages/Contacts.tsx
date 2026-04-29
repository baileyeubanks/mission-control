import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, MoreHorizontal, Database } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

interface Contact {
  id: string;
  name: string;
  type: string;
  status: string;
  owner_name?: string;
  last_contact_at?: string;
}

export function Contacts() {
  const { isAuthReady, user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isAuthReady || !user) return;

    async function fetchContacts() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setContacts(data || []);
      } catch (error) {
        console.error("Error fetching contacts from Supabase:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchContacts();
  }, [isAuthReady, user]);

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Contacts & Accounts</h1>
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase">
            <Database className="h-3 w-3 text-success" />
            Authority: Supabase_Truth
          </div>
        </div>
        <Button
          size="sm"
          className="h-9 font-mono uppercase text-[10px] tracking-wider"
          disabled
          title="Contact creation is locked until the company-scoped contact write path is connected."
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Contact locked
        </Button>
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
              aria-label="Search contacts"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 font-mono uppercase text-[10px] border-white/10"
            aria-label="Filter contacts"
            disabled
            title="Advanced contact filters are not wired yet. Search is active."
          >
            <Filter className="mr-2 h-3.5 w-3.5" />
            Search only
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-black/40 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="w-[120px] font-mono text-[10px] uppercase tracking-widest">System_ID</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Entity_Name</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Type</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Status</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Authority_Owner</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest">Last_Sync</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest">Initialising_Contact_Stream...</TableCell>
                </TableRow>
              ) : filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest">No_Records_Found</TableCell>
                </TableRow>
              ) : filteredContacts.map((contact) => (
                <TableRow key={contact.id} className="group hover:bg-white/5 border-white/5 transition-colors">
                  <TableCell className="font-mono text-[10px] text-muted-foreground/60">{contact.id.slice(0, 12)}</TableCell>
                  <TableCell className="font-medium text-sm">{contact.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-tighter bg-white/5 border-white/10">{contact.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${contact.status === "Active" ? "bg-success" : contact.status === "Lead" ? "bg-primary" : "bg-muted"}`} />
                      <span className="text-[10px] font-mono uppercase tracking-wider">{contact.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] font-mono text-muted-foreground uppercase">{contact.owner_name || 'UNASSIGNED'}</TableCell>
                  <TableCell className="text-right text-[10px] font-mono text-muted-foreground uppercase">
                    {contact.last_contact_at ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(contact.last_contact_at)) : 'NEVER'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Actions for ${contact.name}`}
                      disabled
                      title="Contact detail actions need the company-scoped contact backend."
                    >
                      <MoreHorizontal className="h-4 w-4" />
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
