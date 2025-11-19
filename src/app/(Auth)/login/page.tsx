import Image from "next/image";
import LoginForm from "@/components/Login/LoginForm";
import { LoginImage } from "@/lib/paths";
import TermPolicyModal from "@/components/modal/TermPolicyModal";
import ModalLayout from "@/layouts/ModalLayout";

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function LoginPage({ searchParams }: Props) {
  // ✅ Await searchParams properly
  const params = await searchParams;

  // ✅ Safely check existence of query params
  const showTermsModal = Boolean(
    params?.terms === "" && params?.condition === ""
  );

  return (
    <>
      <div
        style={{ background: "var(--background-gradient)" }}
        className="h-screen flex flex-col items-start justify-center overflow-hidden px-4 py-12"
      >
        <div className="w-fit h-fit">
          <Image
            src="/logo.png"
            width={200}
            height={200}
            alt="Avea"
            priority
            loading="eager"
          />
        </div>
        <div className="flex items-center justify-center w-full mt-5 px-4">
          <div className="flex flex-col  md:flex-row w-full max-w-6xl backdrop-blur-sm min-h-[400px] gap-4">
            {/* Login Form */}
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white rounded-lg shadow-xl border-2 border-[var(--primary-background)]/60">
              <h2 className="text-4xl font-extrabold text-gray-800 mb-2">
                Welcome to HR Portal
              </h2>
              <p className="text-gray-500 mb-8">
                Enter your credentials to access your account.
              </p>
              <LoginForm />
            </div>

            <div className="hidden md:flex w-full md:w-1/2 items-center justify-center">
              <Image
                src={LoginImage.path}
                alt={LoginImage.alt}
                className="w-full h-auto max-w-[85%]"
                width={LoginImage.width}
                height={LoginImage.height}
                priority
              />
            </div>
          </div>
        </div>
      </div>
      {showTermsModal && (
        <ModalLayout>
          <TermPolicyModal />
        </ModalLayout>
      )}
    </>
  );
}
