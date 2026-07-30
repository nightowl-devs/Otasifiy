import { QueryProvider } from "@/components/providers/query-provider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { UserProvider } from "@/context/auth-context";
import { ProjectProvider } from "@/context/project-context";
import { requireSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();
  const { githubToken: _, ...safeUser } = session.user;
  return (
    <UserProvider user={safeUser}>
      <QueryProvider>
        <ProjectProvider>
          <div className="min-h-screen bg-zinc-900 flex-col flex">
            <TopBar />
            <div className="flex flex-1 min-h-0">
              <Sidebar />
              <main className="flex-1 overflow-auto">{children}</main>
            </div>
          </div>
        </ProjectProvider>
      </QueryProvider>
    </UserProvider>
  );
}
