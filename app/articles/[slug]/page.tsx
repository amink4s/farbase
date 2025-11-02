// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ArticleViewPage(props: any) {
  const slug = props?.params?.slug ?? "";
  return (
    <div style={{ padding: 24 }}>
      <h1>Article: {slug}</h1>
      <p>Article view is not implemented yet. The API GET endpoint will be added in the next iteration.</p>
    </div>
  );
}
