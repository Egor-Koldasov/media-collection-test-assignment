import { useEffect, useRef } from 'react';

interface InfiniteSentinelProps {
  disabled: boolean;
  onEnter: () => void;
}

export function InfiniteSentinel({
  disabled,
  onEnter
}: InfiniteSentinelProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const onEnterRef = useRef(onEnter);

  useEffect(() => {
    onEnterRef.current = onEnter;
  }, [onEnter]);

  useEffect(() => {
    const node = ref.current;

    if (!node || disabled) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry?.isIntersecting) {
          onEnterRef.current();
        }
      },
      {
        rootMargin: '420px 0px'
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [disabled]);

  return <div ref={ref} className="h-2 w-full" aria-hidden="true" />;
}
