import { IconFilter } from '@tabler/icons-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface FilterPopoverProps {
  label: string;
  children: React.ReactNode;
  /** 'white' for colored title bars, 'dark' for neutral title bars */
  variant?: 'white' | 'dark';
}

export function FilterPopover({ label, children, variant = 'white' }: FilterPopoverProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors data-[state=open]:ring-1',
            variant === 'white'
              ? 'border-white/30 bg-white/10 text-white hover:bg-white/20 data-[state=open]:bg-white/25 data-[state=open]:ring-white/40'
              : 'border-border-default bg-surface-card text-text-secondary hover:bg-surface-secondary data-[state=open]:bg-surface-secondary data-[state=open]:ring-border-default',
          )}
        >
          <IconFilter size={13} />
          {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px] p-2">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
