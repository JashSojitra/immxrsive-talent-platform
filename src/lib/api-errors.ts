export interface ApiErrorDetail {
  field: string;
  code: string;
  message: string;
  value?: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: ApiErrorDetail[];
  };
}

export function apiErrorResponse(
  status: number,
  code: string,
  message: string,
  details: ApiErrorDetail[] = [],
) {
  return Response.json(
    { error: { code, message, details } } satisfies ApiErrorBody,
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
