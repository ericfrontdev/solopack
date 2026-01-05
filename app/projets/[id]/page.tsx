import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { ProjectDetailClient } from '@/components/pages/project-detail-client'

async function getProject(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      client: { userId },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          company: true,
          email: true,
        },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
        },
      },
      files: {
        orderBy: { uploadedAt: 'desc' },
      },
      paymentAgreement: true,
      _count: {
        select: {
          invoices: true,
          files: true,
        },
      },
    },
  })

  if (!project) {
    notFound()
  }

  return project
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const { id } = await params
  const project = await getProject(id, session.user.id)

  return <ProjectDetailClient project={project} />
}
