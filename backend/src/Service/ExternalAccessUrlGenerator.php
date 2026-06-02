<?php

declare(strict_types=1);

/**
 * Comentario de mantenimiento Agora.
 * Proposito: construye URLs publicas coherentes cuando la aplicacion se ejecuta detras de cloud, nip.io o tunel.
 * Relaciones: centraliza enlaces de verificacion, portal externo y rutas absolutas usadas por correos/API.
 */

namespace App\Service;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

final class ExternalAccessUrlGenerator
{
    public function __construct(
        private readonly UrlGeneratorInterface $urlGenerator,
        private readonly PublicAccessManager $publicAccessManager,
    ) {
    }

    public function buildRouteUrl(string $routeName, array $parameters = [], ?Request $request = null): string
    {
        $absoluteUrl = $this->urlGenerator->generate($routeName, $parameters, UrlGeneratorInterface::ABSOLUTE_URL);

        return $this->replaceOrigin($absoluteUrl, $this->resolveOrigin($request));
    }

    public function buildPortalUrl(string $path = '/', array $query = [], ?Request $request = null): string
    {
        $portalBase = rtrim(
            $this->urlGenerator->generate('frontend_portal_index', [], UrlGeneratorInterface::ABSOLUTE_URL),
            '/'
        );
        $normalizedPath = '/' . ltrim($path, '/');
        $absoluteUrl = $normalizedPath === '/'
            ? $portalBase
            : $portalBase . $normalizedPath;

        if ($query !== []) {
            $absoluteUrl .= '?' . http_build_query($query);
        }

        return $this->replaceOrigin($absoluteUrl, $this->resolveOrigin($request));
    }

    private function resolveOrigin(?Request $request): string
    {
        $configuredOrigin = $this->readConfiguredOrigin();
        if ($configuredOrigin !== null) {
            return $configuredOrigin;
        }

        $requestOrigin = $this->extractRequestOrigin($request);
        if ($requestOrigin !== null && !$this->isLocalHost((string) parse_url($requestOrigin, PHP_URL_HOST))) {
            return $requestOrigin;
        }

        $publicOrigin = $this->resolvePublicOrigin();
        if ($publicOrigin !== null) {
            return $publicOrigin;
        }

        if ($requestOrigin !== null) {
            return $requestOrigin;
        }

        $defaultOrigin = $this->extractOrigin(
            $this->urlGenerator->generate('frontend_root', [], UrlGeneratorInterface::ABSOLUTE_URL)
        );

        return $defaultOrigin ?? 'http://127.0.0.1:8000';
    }

    private function resolvePublicOrigin(): ?string
    {
        $snapshot = $this->publicAccessManager->getSnapshot();
        if (($snapshot['status'] ?? null) !== 'active') {
            return null;
        }

        return $this->extractOrigin((string) ($snapshot['publicUrl'] ?? ''));
    }

    private function readConfiguredOrigin(): ?string
    {
        $configured = $_ENV['APP_EXTERNAL_BASE_URL'] ?? $_SERVER['APP_EXTERNAL_BASE_URL'] ?? null;
        if (!is_string($configured) || trim($configured) === '') {
            return null;
        }

        return $this->extractOrigin($configured);
    }

    private function extractRequestOrigin(?Request $request): ?string
    {
        if ($request === null) {
            return null;
        }

        $scheme = $this->firstForwardedValue((string) (
            $request->headers->get('x-forwarded-proto')
            ?? $request->headers->get('x-forwarded-scheme')
            ?? $request->getScheme()
        ));
        if (!in_array($scheme, ['http', 'https'], true)) {
            $scheme = $request->getScheme();
        }

        $host = $this->firstForwardedValue((string) (
            $request->headers->get('x-forwarded-host')
            ?? $request->getHttpHost()
        ));
        if ($host === '') {
            $host = $request->getHttpHost();
        }

        if ($host === '') {
            return null;
        }

        return sprintf('%s://%s', $scheme, $host);
    }

    private function replaceOrigin(string $absoluteUrl, string $origin): string
    {
        $parts = parse_url($absoluteUrl);
        $path = (string) ($parts['path'] ?? '');
        $query = isset($parts['query']) ? '?' . $parts['query'] : '';
        $fragment = isset($parts['fragment']) ? '#' . $parts['fragment'] : '';

        return rtrim($origin, '/') . $path . $query . $fragment;
    }

    private function extractOrigin(string $url): ?string
    {
        $parts = parse_url(trim($url));
        if (!is_array($parts)) {
            return null;
        }

        $scheme = $parts['scheme'] ?? null;
        $host = $parts['host'] ?? null;
        if (!is_string($scheme) || !is_string($host) || $scheme === '' || $host === '') {
            return null;
        }

        $port = isset($parts['port']) ? ':' . $parts['port'] : '';

        return sprintf('%s://%s%s', $scheme, $host, $port);
    }

    private function isLocalHost(string $host): bool
    {
        $normalized = strtolower(trim($host));

        return in_array($normalized, ['127.0.0.1', 'localhost', '0.0.0.0', '::1'], true);
    }

    private function firstForwardedValue(string $value): string
    {
        $parts = explode(',', $value);

        return strtolower(trim($parts[0] ?? ''));
    }
}
