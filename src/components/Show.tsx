type ShowProps<T> = 
	| {
			when: boolean;
			children: React.ReactNode;
			fallback?: React.ReactNode;
			value?: never; // Explicitly exclude value
	  }
	| {
			value: T | null | undefined;
			children: (v: T) => React.ReactNode;
			fallback?: React.ReactNode;
			when?: never; // Explicitly exclude when
	  };

export function Show(props: {
	when: boolean;
	children: React.ReactNode;
	fallback?: React.ReactNode;
}): React.ReactNode;
export function Show<T>(props: {
	value: T | null | undefined;
	children: (value: T) => React.ReactNode;
	fallback?: React.ReactNode;
}): React.ReactNode;
export function Show<T>(props: ShowProps<T>) {
	if (props.when !== undefined) {
		if (!props.when) {
			return props.fallback;
		}
		return props.children;
	}
	
	if (props.value === null || props.value === undefined) {
		return props.fallback;
	}
	return props.children(props.value);
}