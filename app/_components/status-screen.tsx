import { AvatarGuide } from "./avatar/avatar-guide";

type Props = {
  title: string;
  description: string;
  /** アバターが話す一言 */
  messages: string[];
  /** 次にやること（戻る・もう一度試す） */
  children: React.ReactNode;
};

/**
 * 見つからない・エラーなど、画面を出せなかったときの画面。どの画面で起きても同じに見えるよう、AppLayout に頼らず中央に出す
 * （AppLayout はホームとログインの画面では見出しを描かないため）。
 */
export function StatusScreen({ title, description, messages, children }: Props) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-6 pt-32 pb-36 text-center">
      <div className="pt-16">
        <AvatarGuide messages={messages} />
      </div>
      <h1 className="text-3xl leading-tight font-black tracking-tight sm:text-4xl">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </main>
  );
}
