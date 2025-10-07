<?php

namespace App\Controller\Api;

use App\Entity\Multimedia;
use App\Entity\MultimediaType;
use App\Repository\MultimediaRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/multimedia')]
class MultimediaController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private MultimediaRepository $multimediaRepository
    ) {}

    #[Route('', name: 'api_multimedia_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        try {
            $tipo = $request->query->get('tipo');
            $categoria = $request->query->get('categoria');
            $tags = $request->query->get('tags');
            
            if ($tipo) {
                try {
                    MultimediaType::from($tipo);
                } catch (\ValueError $e) {
                    return $this->json(['success' => false, 'error' => 'Tipo inválido'], 400);
                }
                
                $multimedia = $this->multimediaRepository->findPublicByType($tipo);
            } elseif ($categoria) {
                $multimedia = $this->multimediaRepository->findByCategory($categoria);
            } elseif ($tags) {
                $tagsArray = explode(',', $tags);
                $multimedia = $this->multimediaRepository->findByTags($tagsArray);
            } else {
                $multimedia = $this->multimediaRepository->findBy(['publico' => true], ['nombre' => 'ASC']);
            }

            return $this->json([
                'success' => true,
                'multimedia' => array_map(function(Multimedia $item) {
                    return [
                        'id' => $item->getId(),
                        'nombre' => $item->getNombre(),
                        'tipo' => $item->getTipo()->value,
                        'url' => $item->getUrl(),
                        'thumbnail_url' => $item->getThumbnailUrl(),
                        'categoria' => $item->getCategoria(),
                        'tags' => $item->getTags(),
                        'formato' => $item->getFormato(),
                        'tamaño_bytes' => $item->getTamañoBytes()
                    ];
                }, $multimedia)
            ]);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error obteniendo multimedia: ' . $e->getMessage()
            ], 500);
        }
    }

    #[Route('/stickers', name: 'api_multimedia_stickers', methods: ['GET'])]
    public function getStickers(): JsonResponse
    {
        try {
            $stickers = $this->multimediaRepository->findPublicByType('sticker');
            
            return $this->json([
                'success' => true,
                'stickers' => array_map(function(Multimedia $sticker) {
                    return [
                        'id' => $sticker->getId(),
                        'nombre' => $sticker->getNombre(),
                        'url' => $sticker->getUrl(),
                        'thumbnail_url' => $sticker->getThumbnailUrl(),
                        'categoria' => $sticker->getCategoria(),
                        'tags' => $sticker->getTags()
                    ];
                }, $stickers)
            ]);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error obteniendo stickers: ' . $e->getMessage()
            ], 500);
        }
    }

    #[Route('/gifs', name: 'api_multimedia_gifs', methods: ['GET'])]
    public function getGifs(): JsonResponse
    {
        try {
            $gifs = $this->multimediaRepository->findPublicByType('gif');
            
            return $this->json([
                'success' => true,
                'gifs' => array_map(function(Multimedia $gif) {
                    return [
                        'id' => $gif->getId(),
                        'nombre' => $gif->getNombre(),
                        'url' => $gif->getUrl(),
                        'thumbnail_url' => $gif->getThumbnailUrl(),
                        'categoria' => $gif->getCategoria(),
                        'tags' => $gif->getTags(),
                        'tamaño_bytes' => $gif->getTamañoBytes()
                    ];
                }, $gifs)
            ]);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error obteniendo GIFs: ' . $e->getMessage()
            ], 500);
        }
    }

    #[Route('/emojis', name: 'api_multimedia_emojis', methods: ['GET'])]
    public function getEmojis(): JsonResponse
    {
        try {
            $emojis = $this->multimediaRepository->findPublicByType('emoji');
            
            return $this->json([
                'success' => true,
                'emojis' => array_map(function(Multimedia $emoji) {
                    return [
                        'id' => $emoji->getId(),
                        'nombre' => $emoji->getNombre(),
                        'url' => $emoji->getUrl(),
                        'categoria' => $emoji->getCategoria(),
                        'tags' => $emoji->getTags()
                    ];
                }, $emojis)
            ]);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error obteniendo emojis: ' . $e->getMessage()
            ], 500);
        }
    }

    #[Route('', name: 'api_multimedia_upload', methods: ['POST'])]
    public function upload(Request $request): JsonResponse
    {
        try {
            // Para el MVP, vamos a crear multimedia con URLs externas
            $data = json_decode($request->getContent(), true);
            
            $required = ['nombre', 'tipo', 'url'];
            foreach ($required as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    return $this->json([
                        'success' => false,
                        'error' => "El campo $field es requerido"
                    ], 400);
                }
            }

            try {
                $tipo = MultimediaType::from($data['tipo']);
            } catch (\ValueError $e) {
                return $this->json(['success' => false, 'error' => 'Tipo inválido'], 400);
            }

            // Usuario actual (en producción vendría del JWT)
            $usuario = $this->entityManager->getRepository(\App\Entity\Usuario::class)->find(1);

            $multimedia = new Multimedia();
            $multimedia->setNombre($data['nombre']);
            $multimedia->setTipo($tipo);
            $multimedia->setUrl($data['url']);
            $multimedia->setSubidoPor($usuario);
            
            if (isset($data['thumbnail_url'])) {
                $multimedia->setThumbnailUrl($data['thumbnail_url']);
            }
            
            if (isset($data['categoria'])) {
                $multimedia->setCategoria($data['categoria']);
            }
            
            if (isset($data['tags']) && is_array($data['tags'])) {
                $multimedia->setTags($data['tags']);
            }
            
            if (isset($data['formato'])) {
                $multimedia->setFormato($data['formato']);
            }
            
            if (isset($data['tamaño_bytes'])) {
                $multimedia->setTamañoBytes((int)$data['tamaño_bytes']);
            }

            $this->entityManager->persist($multimedia);
            $this->entityManager->flush();

            return $this->json([
                'success' => true,
                'message' => 'Multimedia subido exitosamente',
                'multimedia' => [
                    'id' => $multimedia->getId(),
                    'nombre' => $multimedia->getNombre(),
                    'tipo' => $multimedia->getTipo()->value,
                    'url' => $multimedia->getUrl()
                ]
            ], 201);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error subiendo multimedia: ' . $e->getMessage()
            ], 500);
        }
    }

    #[Route('/categorias', name: 'api_multimedia_categories', methods: ['GET'])]
    public function getCategories(): JsonResponse
    {
        try {
            // Obtener categorías únicas
            $qb = $this->entityManager->createQueryBuilder();
            $categorias = $qb->select('DISTINCT m.categoria')
                ->from(Multimedia::class, 'm')
                ->where('m.publico = :publico')
                ->andWhere('m.categoria IS NOT NULL')
                ->setParameter('publico', true)
                ->getQuery()
                ->getScalarResult();

            $categoriasLimpia = array_map(fn($cat) => $cat['categoria'], $categorias);

            return $this->json([
                'success' => true,
                'categorias' => $categoriasLimpia
            ]);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error obteniendo categorías: ' . $e->getMessage()
            ], 500);
        }
    }

    #[Route('/{id}', name: 'api_multimedia_get', methods: ['GET'])]
    public function get(int $id): JsonResponse
    {
        try {
            $multimedia = $this->multimediaRepository->find($id);
            
            if (!$multimedia || !$multimedia->isPublico()) {
                return $this->json(['success' => false, 'error' => 'Multimedia no encontrado'], 404);
            }

            return $this->json([
                'success' => true,
                'multimedia' => [
                    'id' => $multimedia->getId(),
                    'nombre' => $multimedia->getNombre(),
                    'tipo' => $multimedia->getTipo()->value,
                    'url' => $multimedia->getUrl(),
                    'thumbnail_url' => $multimedia->getThumbnailUrl(),
                    'categoria' => $multimedia->getCategoria(),
                    'tags' => $multimedia->getTags(),
                    'formato' => $multimedia->getFormato(),
                    'tamaño_bytes' => $multimedia->getTamañoBytes(),
                    'fecha_creacion' => $multimedia->getFechaCreacion()->format('Y-m-d H:i:s'),
                    'subido_por' => $multimedia->getSubidoPor() ? [
                        'id' => $multimedia->getSubidoPor()->getId(),
                        'username' => $multimedia->getSubidoPor()->getUsername()
                    ] : null
                ]
            ]);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error obteniendo multimedia: ' . $e->getMessage()
            ], 500);
        }
    }
}