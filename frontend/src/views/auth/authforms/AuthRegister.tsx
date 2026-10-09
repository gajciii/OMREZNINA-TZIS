import { Button, Label, TextInput } from "flowbite-react";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth, useFirebaseEmulators } from "src/firebase-config";
import { emailActionSettings, getLocalEmailActionLink } from "src/utils/emailActions";
import { Icon } from "@iconify/react";

const AuthRegister = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);
  const [registeredCredentials, setRegisteredCredentials] = useState<{ email: string; password: string } | null>(null);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 6) return "Geslo mora imeti vsaj 6 znakov.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Geslo mora vsebovati simbol.";
    if (!/\d/.test(pwd)) return "Geslo mora vsebovati številko.";
    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");
    setInfo("");
    setShowResend(false);
    setVerificationLink(null);

    if (!name.trim()) {
      setError("Vnesite svoje ime.");
      setIsSubmitting(false);
      return;
    }

    if (!email.trim()) {
      setError("Vnesite email naslov.");
      setIsSubmitting(false);
      return;
    }

    if (!email.includes("@")) {
      setError("Email mora vsebovati znak '@'.");
      setIsSubmitting(false);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Gesli se ne ujemata.");
      setIsSubmitting(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });
      auth.languageCode = 'sl';

      await sendEmailVerification(user, emailActionSettings('/auth/verify-info'));
      const localLink = await getLocalEmailActionLink(email, 'VERIFY_EMAIL');
      setVerificationLink(localLink);
      setRegisteredCredentials({ email, password });
      setInfo(useFirebaseEmulators
        ? localLink
          ? "Registracija uspešna! Email potrdite s spodnjo lokalno povezavo."
          : "Registracija uspešna! Potrditvena povezava je v izpisu lokalnega emulatorja."
        : "Registracija uspešna! Potrditveni email je bil poslan.");
      setShowResend(true);

      await auth.signOut();
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        setError("Email je že v uporabi.");
      } else {
        setError("Napaka pri registraciji.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!registeredCredentials || isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const { email: registeredEmail, password: registeredPassword } = registeredCredentials;
      const { user } = await signInWithEmailAndPassword(auth, registeredEmail, registeredPassword);

      if (!user.emailVerified) {
        auth.languageCode = 'sl';

        await sendEmailVerification(user, emailActionSettings('/auth/verify-info'));
        const localLink = await getLocalEmailActionLink(registeredEmail, 'VERIFY_EMAIL');
        setVerificationLink(localLink);
        setInfo(useFirebaseEmulators
          ? localLink
            ? "Nova potrditvena povezava je pripravljena spodaj."
            : "Nova potrditvena povezava je v izpisu lokalnega emulatorja."
          : "Potrditveni email je bil ponovno poslan.");
      } else {
        setInfo("Email je že potrjen. Sedaj se lahko prijavite.");
        setShowResend(false);
        setVerificationLink(null);
      }
    } catch (err) {
      setError("Napaka pri ponovnem pošiljanju emaila.");
    } finally {
      await auth.signOut();
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <Label htmlFor="name" value="Ime" />
        <TextInput
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="form-control form-rounded-xl"
        />
      </div>

      <div className="mb-4">
        <Label htmlFor="email" value="Email naslov" />
        <TextInput
          id="email"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-control form-rounded-xl"
        />
      </div>

      <div className="mb-4 relative">
        <Label htmlFor="password" value="Geslo" />
        <TextInput
          id="password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-control form-rounded-xl pr-10"
        />
        <span
          className="absolute right-3 top-[38px] cursor-pointer text-gray-600"
          onClick={() => setShowPassword(!showPassword)}
        >
          <Icon icon={showPassword ? "mdi:eye-off" : "mdi:eye"} height={20} />
        </span>
      </div>

      <div className="mb-6">
        <Label htmlFor="confirm-password" value="Potrdi geslo" />
        <TextInput
          id="confirm-password"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="form-control form-rounded-xl"
        />
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {info && <p className="text-green-600 text-sm mb-4">{info}</p>}
      {verificationLink && (
        <a href={verificationLink} className="block text-primary underline text-sm mb-4">
          Potrdi lokalni email naslov
        </a>
      )}

      {showResend && (
        <div className="mb-4">
          <p className="text-sm text-gray-700">
            Niste prejeli potrditvenega emaila?
          </p>
          <Button
            onClick={handleResendVerification}
            type="button"
            disabled={isSubmitting}
            size="xs"
            className="mt-2"
          >
            Pošlji ponovno potrditveni email
          </Button>
        </div>
      )}

      <Button color="primary" type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Pošiljanje..." : "Registracija"}
      </Button>
    </form>
  );
};

export default AuthRegister;
