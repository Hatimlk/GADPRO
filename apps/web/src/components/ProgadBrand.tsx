type ProgadBrandProps = {
  tone?: 'light' | 'dark';
  className?: string;
};

export function ProgadBrand({ tone = 'light', className = '' }: ProgadBrandProps) {
  const source = tone === 'dark' ? '/Asset%2010@4x.png' : '/Asset%206@4x.png';

  return (
    <img
      src={source}
      alt="PROGAD — ERP interne de GADIMAT"
      className={`h-auto w-48 object-contain object-left ${className}`}
    />
  );
}
