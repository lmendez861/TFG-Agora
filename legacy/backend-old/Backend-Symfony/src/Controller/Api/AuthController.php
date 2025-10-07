<?php

namespace App\Controller\Api;

use App\Entity\Usuario;
use App\Repository\UsuarioRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/auth')]
class AuthController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private UserPasswordHasherInterface $passwordHasher,
        private ValidatorInterface $validator
    ) {}

    #[Route('/login', name: 'api_auth_login', methods: ['POST'])]
    public function login(Request $request, UsuarioRepository $usuarioRepository): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        
        if (!isset($data['username']) || !isset($data['password'])) {
            return $this->json(['error' => 'Username y password son requeridos'], 400);
        }

        $usuario = $usuarioRepository->findByEmailOrUsername($data['username']);
        
        if (!$usuario || !$this->passwordHasher->isPasswordValid($usuario, $data['password'])) {
            return $this->json(['error' => 'Credenciales inválidas'], 401);
        }

        if (!$usuario->isActivo()) {
            return $this->json(['error' => 'Usuario desactivado'], 401);
        }

        // Actualizar último login
        $usuario->setUltimoLogin(new \DateTime());
        $this->entityManager->flush();

        // En producción, aquí generarías un JWT token
        $token = base64_encode($usuario->getId() . ':' . time());

        return $this->json([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $usuario->getId(),
                'username' => $usuario->getUsername(),
                'email' => $usuario->getEmail(),
                'nombre' => $usuario->getNombre(),
                'rol' => $usuario->getRol()->getNombre()
            ]
        ]);
    }

    #[Route('/register', name: 'api_auth_register', methods: ['POST'])]
    public function register(Request $request, UsuarioRepository $usuarioRepository): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        
        // Validar datos requeridos
        $required = ['username', 'email', 'password', 'nombre'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                return $this->json(['error' => "El campo $field es requerido"], 400);
            }
        }

        // Verificar si el usuario ya existe
        $existingUser = $usuarioRepository->findByEmailOrUsername($data['username']);
        if ($existingUser) {
            return $this->json(['error' => 'El usuario ya existe'], 409);
        }

        $existingEmail = $usuarioRepository->findOneBy(['email' => $data['email']]);
        if ($existingEmail) {
            return $this->json(['error' => 'El email ya está registrado'], 409);
        }

        // Crear nuevo usuario
        $usuario = new Usuario();
        $usuario->setUsername($data['username']);
        $usuario->setEmail($data['email']);
        $usuario->setNombre($data['nombre']);
        $usuario->setPasswordHash($this->passwordHasher->hashPassword($usuario, $data['password']));
        
        // Asignar rol de usuario por defecto (ID 2)
        $rolUsuario = $this->entityManager->getRepository(\App\Entity\Rol::class)->find(2);
        $usuario->setRol($rolUsuario);
        $usuario->setActivo(true);

        // Validar entidad
        $errors = $this->validator->validate($usuario);
        if (count($errors) > 0) {
            return $this->json(['error' => 'Datos inválidos'], 400);
        }

        $this->entityManager->persist($usuario);
        $this->entityManager->flush();

        return $this->json([
            'success' => true,
            'message' => 'Usuario registrado exitosamente',
            'user' => [
                'id' => $usuario->getId(),
                'username' => $usuario->getUsername(),
                'email' => $usuario->getEmail(),
                'nombre' => $usuario->getNombre()
            ]
        ], 201);
    }

    #[Route('/verify', name: 'api_auth_verify', methods: ['POST'])]
    public function verify(Request $request): JsonResponse
    {
        $token = $request->headers->get('Authorization');
        
        if (!$token) {
            return $this->json(['error' => 'Token no proporcionado'], 401);
        }

        // Remover "Bearer " del token si existe
        $token = str_replace('Bearer ', '', $token);
        
        // Decodificar token simple (en producción usar JWT)
        $decoded = base64_decode($token);
        if (!$decoded) {
            return $this->json(['error' => 'Token inválido'], 401);
        }

        [$userId, $timestamp] = explode(':', $decoded);
        
        // Verificar que el token no sea muy viejo (24 horas)
        if (time() - $timestamp > 86400) {
            return $this->json(['error' => 'Token expirado'], 401);
        }

        $usuario = $this->entityManager->getRepository(Usuario::class)->find($userId);
        if (!$usuario || !$usuario->isActivo()) {
            return $this->json(['error' => 'Usuario no válido'], 401);
        }

        return $this->json([
            'valid' => true,
            'user' => [
                'id' => $usuario->getId(),
                'username' => $usuario->getUsername(),
                'email' => $usuario->getEmail(),
                'nombre' => $usuario->getNombre(),
                'rol' => $usuario->getRol()->getNombre()
            ]
        ]);
    }
}