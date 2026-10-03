/** Plain GET form: works without JavaScript and keeps the query in the URL. */
export function SearchInput({ placeholder, defaultValue, autoFocus }: { placeholder?: string; defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form action="/search" method="get" role="search" className="search-form">
      <label htmlFor="q" className="sr-only">Zoeken</label>
      <input id="q" name="q" type="search" minLength={2} maxLength={100} defaultValue={defaultValue} placeholder={placeholder} autoFocus={autoFocus} autoComplete="off" />
      <button type="submit">Zoeken</button>
    </form>
  );
}
