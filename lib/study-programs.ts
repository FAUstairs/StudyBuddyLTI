const sparqlQuery = `PREFIX heo: <https://mathhub.info/heo#>

SELECT DISTINCT ?subjectName
WHERE {
    ?subject heo:subjectName ?subjectName .
}
ORDER BY ?subjectName`;

type SparqlBinding = {
  subjectName?: {
    value?: string;
  };
};

type SparqlResponse = {
  results?: {
    bindings?: SparqlBinding[];
  };
};

export async function getStudyPrograms() {
  const response = await fetch('https://mathhub.info/api/backend/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ query: sparqlQuery }),
  });

  if (!response.ok) {
    throw new Error(`SPARQL request failed with status ${response.status}`);
  }

  const data = (await response.json()) as SparqlResponse;
  return (data.results?.bindings ?? [])
    .map((binding) => binding.subjectName?.value)
    .filter((program): program is string => Boolean(program));
}
