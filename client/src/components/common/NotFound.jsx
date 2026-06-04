import { Link } from 'react-router-dom';
import { MdOutlineBrokenImage } from 'react-icons/md';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-light flex flex-col items-center justify-center p-4">
      <div className="text-center animate-slide-up">
        <div className="flex justify-center mb-6">
          <MdOutlineBrokenImage className="text-primary text-9xl animate-bounce-soft" />
        </div>
        <h1 className="text-8xl font-bold text-dark mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-secondary mb-2">Page Not Found</h2>
        <p className="text-muted mb-8">The road you're looking for seems to be a dead end.</p>
        <Link to="/">
          <button className="btn-primary">Go Home</button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
