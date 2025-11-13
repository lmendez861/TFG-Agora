<?php

namespace App\Controller\Api;

use DateTimeImmutable;
use JsonException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Validator\ConstraintViolationListInterface;

/**
 * Shared helpers for JSON based API endpoints.
 */
trait JsonRequestTrait
{
    /**
     * Decodes the incoming JSON request body and returns an error response when invalid.
     *
     * @return array<string, mixed>|JsonResponse
     */
    private function decodePayload(Request $request): array|JsonResponse
    {
        try {
            $data = json_decode($request->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return $this->json([
                'message' => 'El cuerpo de la petición no contiene JSON válido.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if (!is_array($data)) {
            return $this->json([
                'message' => 'El cuerpo de la petición debe ser un objeto JSON.',
            ], Response::HTTP_BAD_REQUEST);
        }

        return $data;
    }

    private function validationErrorResponse(ConstraintViolationListInterface $violations): JsonResponse
    {
        $errors = [];

        foreach ($violations as $violation) {
            $errors[$violation->getPropertyPath()][] = $violation->getMessage();
        }

        return $this->json([
            'message' => 'Los datos enviados no superan las validaciones.',
            'errors' => $errors,
        ], Response::HTTP_BAD_REQUEST);
    }

    private function parseDate(string $value, string $fieldName): DateTimeImmutable|JsonResponse
    {
        $date = DateTimeImmutable::createFromFormat('Y-m-d', $value);

        if ($date === false) {
            return $this->json([
                'message' => sprintf('El campo "%s" debe tener el formato YYYY-MM-DD.', $fieldName),
            ], Response::HTTP_BAD_REQUEST);
        }

        $errors = date_get_last_errors();
        if (is_array($errors) && ($errors['warning_count'] > 0 || $errors['error_count'] > 0)) {
            return $this->json([
                'message' => sprintf('El campo "%s" debe tener el formato YYYY-MM-DD.', $fieldName),
            ], Response::HTTP_BAD_REQUEST);
        }

        return $date;
    }
}
