

import { Link } from 'react-router';
import { useAuth } from 'src/contexts/AuthContext';

const VerifyInfo = () => {
  const { user } = useAuth();
  return (
    <div className="text-center mt-10 text-lg font-medium text-gray-800">
      <p>{user && !user.emailVerified
        ? 'Za prijavo najprej potrdite email naslov s potrditveno povezavo.'
        : 'Email je uspešno potrjen. Sedaj se lahko prijavite.'}</p>
      <Link to="/auth/login" className="inline-block mt-4 text-primary underline">Pojdi na prijavo</Link>
    </div>
  );
};

export default VerifyInfo;
