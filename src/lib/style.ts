type CSSPropertyName = keyof React.CSSProperties;
type CSSPropertyValue<T extends CSSPropertyName> = React.CSSProperties[T];

type ValidCSSProperties = {
  [K in CSSPropertyName]?: CSSPropertyValue<K>;
};

// Style object with create method
export const Style = {
  /**
   * Creates a type-safe style object
   * @param styles - CSS style object
   * @returns Type-safe style object
   */
  create<T extends ValidCSSProperties>(styles: T): T {
    // Optional runtime validation in development
    if (process.env.NODE_ENV === 'development') {
      const validCSSProperties = new Set(
        Object.keys({} as React.CSSProperties)
      );
      
      for (const key in styles) {
        if (!validCSSProperties.has(key)) {
          console.warn(
            `⚠️ Style.create: "${key}" is not a valid CSS property.`
          );
        }
      }
    }
    
    return styles;
  },

  /**
   * Creates styles with responsive breakpoints
   */
  responsive<T extends ValidCSSProperties>(
    baseStyles: T,
    breakpoints: {
      [breakpoint: string]: Partial<T>;
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): T & { [key: string]: any } {
    return {
      ...baseStyles,
      ...Object.entries(breakpoints).reduce((acc, [breakpoint, styles]) => ({
        ...acc,
        [`@media (min-width: ${breakpoint})`]: styles
      }), {})
    };
  },

  /**
   * Merges multiple style objects
   */
  merge<T extends ValidCSSProperties>(...styles: T[]): T {
    return styles.reduce((acc, style) => ({
      ...acc,
      ...style
    }), {}) as T;
  },

  /**
   * Creates conditional styles
   */
  when<T extends ValidCSSProperties>(
    condition: boolean,
    trueStyles: T,
    falseStyles?: T
  ): T {
    return condition ? trueStyles : (falseStyles || {} as T);
  }
};
