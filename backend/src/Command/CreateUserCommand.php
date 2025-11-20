<?php

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
final class CreateUserCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
        parent::__construct();
    }

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
            ->addOption('full-name', null, InputOption::VALUE_REQUIRED, 'Nombre completo visible en la UI.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $username = (string) $input->getArgument('username');
        $password = (string) $input->getArgument('password');
        $roles = $input->getOption('role');
        $fullName = $input->getOption('full-name');

        $repository = $this->entityManager->getRepository(User::class);
        if ($repository->findOneBy(['username' => $username])) {
            $output->writeln(sprintf('<error>Ya existe un usuario con username "%s".</error>', $username));

            return Command::FAILURE;
        }

        $user = (new User())
            ->setUsername($username)
            ->setRoles($roles)
            ->setFullName($fullName);

        $hashedPassword = $this->passwordHasher->hashPassword($user, $password);
        $user->setPassword($hashedPassword);

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        $output->writeln(sprintf('<info>Usuario "%s" creado correctamente.</info>', $username));

        return Command::SUCCESS;
    }
}
