import * as React from "react";

import { cn, numeric } from "../../lib/utils";
import { useEffect, useRef } from "react";

const TableScrollable = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
	({ className, ...props }, ref) => {
		const parentRef = useRef<HTMLDivElement>(null);
		const isProgrammaticScroll = useRef(false);
		// Restore scroll position on component mount
		useEffect(() => {
			const params = new URLSearchParams(window.location.search);
			const parsed = numeric.safeParse(params.get("scroll"));
			const scrollTop = parsed.success ? parsed.data : 0;

			if (scrollTop && parentRef.current) {
				isProgrammaticScroll.current = true;
				parentRef.current.scrollTop = scrollTop;
				console.log(parentRef.current.scrollTop);

				// Reset the flag after scroll completes
				setTimeout(() => {
					isProgrammaticScroll.current = false;
				}, 100);
			}
		}, []);
		// Throttled scroll handler
		const handleScroll = () => {
			if (isProgrammaticScroll.current || !parentRef.current) return;

			const scrollTop = parentRef.current.scrollTop;
			const params = new URLSearchParams(window.location.search);
			const parsed = numeric.safeParse(params.get("scroll"));
			const currentScroll = parsed.success ? parsed.data : 0;
			// Only update if scroll position changed significantly
			if (Math.abs(currentScroll - scrollTop) > 10) {
				params.set("scroll", scrollTop.toString());
				window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
			}
		};
		return (
			<div className="relative w-full overflow-auto" onScroll={handleScroll} ref={parentRef}>
				<table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
			</div>
		);
	}
);
TableScrollable.displayName = "TableScrollable";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
	({ className, onScroll, ...props }, ref) => (
		<div className="relative w-full overflow-auto" onScroll={onScroll}>
			<table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
		</div>
	)
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
	HTMLTableSectionElement,
	React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
	<thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
	HTMLTableSectionElement,
	React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
	<tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
	HTMLTableSectionElement,
	React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
	<tfoot
		ref={ref}
		className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
		{...props}
	/>
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
	({ className, ...props }, ref) => (
		<tr
			ref={ref}
			className={cn(
				"border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
				className
			)}
			{...props}
		/>
	)
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
	HTMLTableCellElement,
	React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
	<th
		ref={ref}
		className={cn(
			"h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
			className
		)}
		{...props}
	/>
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
	HTMLTableCellElement,
	React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
	<td
		ref={ref}
		className={cn(
			"p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
			className
		)}
		{...props}
	/>
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
	HTMLTableCaptionElement,
	React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
	<caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

export { Table, TableScrollable, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
