<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Comando de consola Symfony: automatiza tareas administrativas del backend.
 * Relaciones: Conecta con App/Entity/User.
 */

namespace App\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:user:create',
    description: 'Crea un usuario para acceder a la API.'
)]
/**
 * Comando de consola Symfony: automatiza tareas administrativas del backend.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class CreateUserCommand extends Command
{
    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
        parent::__construct();
    }

    /**
     * Resume la responsabilidad de configure dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    protected function configure(): void
    {
        $this
            ->addArgument('username', InputArgument::REQUIRED, 'Identificador del usuario (se usará en Basic Auth).')
            ->addArgument('password', InputArgument::REQUIRED, 'Contraseña en texto plano que se almacenará hasheada.')
            ->addOption(
                'role',
                null,
                InputOption::VALUE_IS_ARRAY | InputOption::VALUE_OPTIONAL,
                'Roles adicionales (ROLE_API, ROLE_ADMIN, ...).',
                ['ROLE_API']
            )
            ->addOption('full-name', null, InputOption::VALUE_REQUIRED, 'Nombre completo visible en la UI.')
            ->addOption(
                'update-if-exists',
                null,
                InputOption::VALUE_NONE,
                'Actualiza el usuario si ya existe en lugar de devolver error.'
            );
    }

    /**
     * Resume la responsabilidad de execute dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $username = (string) $input->getArgument('username');
        $password = (string) $input->getArgument('password');
        $roles = $input->getOption('role');
        $fullName = $input->getOption('full-name');
        $updateIfExists = (bool) $input->getOption('update-if-exists');

        $repository = $this->entityManager->getRepository(User::class);
        $existingUser = $repository->findOneBy(['username' => $username]);
        if ($existingUser && !$updateIfExists) {
            $output->writeln(sprintf('<error>Ya existe un usuario con username "%s".</error>', $username));

            return Command::FAILURE;
        }

        $user = ($existingUser ?? new User())
            ->setUsername($username)
            ->setRoles($roles)
            ->setFullName($fullName);

        $hashedPassword = $this->passwordHasher->hashPassword($user, $password);
        $user->setPassword($hashedPassword);

        if (!$existingUser) {
            $this->entityManager->persist($user);
        }
        $this->entityManager->flush();

        $output->writeln(sprintf(
            '<info>Usuario "%s" %s correctamente.</info>',
            $username,
            $existingUser ? 'actualizado' : 'creado'
        ));

        return Command::SUCCESS;
    }
}
