import { PlusIcon } from "lucide-react";
import type { Project } from "@/generated/prisma";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "./ui/select";

interface ProjectSwitcherProps {
  isOpen: boolean;
  onProjectSwitched: (project: string) => void;
  onOpenChange: (open: boolean) => void;
  onAddProject: () => void;
  currentProject: Project;
  projects: Project[];
}
export default function ProjectSwitcher({
  isOpen,
  onOpenChange,
  onProjectSwitched,
  onAddProject,
  currentProject,
  projects,
}: ProjectSwitcherProps) {
  const items = projects.map((p) => ({
    label: p.name || p.githubRepo || p.id,
    value: p.id,
  }));

  return (
    <div className="flex flex-row items-center">
      <Select
        items={items}
        open={isOpen}
        onOpenChange={onOpenChange}
        onValueChange={(value) => {
          const v = value as string;
          if (v === "add-project") {
            onAddProject();
          } else {
            onProjectSwitched(v);
          }
        }}
      >
        <SelectTrigger className={"rounded-md border-1"}>
          <p className="text-sm font-medium text-white">
            {currentProject.name ||
              currentProject.githubRepo ||
              currentProject.id}
          </p>
        </SelectTrigger>
        <SelectContent className={"rounded-md"}>
          <SelectGroup>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name || project.githubRepo || project.id}
              </SelectItem>
            ))}

            <SelectItem key={"add-project"} value={"add-project"}>
              <div className="flex items-center gap-2">
                <PlusIcon className="size-4 text-zinc-400" />
                <p className="text-sm font-medium text-zinc-400">Add project</p>
              </div>
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
