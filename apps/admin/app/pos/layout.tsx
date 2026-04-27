export default function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Full-screen landscape layout, no sidebar — designed for tablet POS
    <div className="min-h-screen bg-[#FAFAF8] font-sans">
      {children}
    </div>
  );
}
