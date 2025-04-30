import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-yellow-400 mb-12">CRYPTO BEACH SOCCER</h1>
      <div className="w-64 h-3 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-white mt-4">Loading assets... {progress}%</p>
      <p className="text-gray-400 mt-8 text-sm italic">Get ready to play with your favorite crypto characters!</p>
    </div>
  );
};

export default LoadingScreen;
