const Loader = ({ text = 'Loading...' }) => (
  <div className="min-h-screen bg-light flex flex-col items-center justify-center">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-gray-200 rounded-full" />
      <div className="w-16 h-16 border-4 border-primary border-t-transparent
                      rounded-full animate-spin absolute top-0 left-0" />
    </div>
    <p className="mt-4 text-muted font-medium">{text}</p>
  </div>
);

export default Loader;
