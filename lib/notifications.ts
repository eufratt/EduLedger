import { prisma } from "./prisma"
import { NotificationType, Role } from "@prisma/client"

export type NotificationData = {
  title: string
  message: string
  type?: NotificationType
  link?: string
}

export async function createNotification(userIds: number[], data: NotificationData) {
  if (userIds.length === 0) return

  return prisma.notification.createMany({
    data: userIds.map(userId => ({
      userId,
      title: data.title,
      message: data.message,
      type: data.type || "INFO",
      link: data.link || null,
      isRead: false,
    }))
  })
}

export async function notifyByRole(role: Role, data: NotificationData) {
  const users = await prisma.user.findMany({
    where: { role, isActive: true },
    select: { id: true }
  })
  
  const ids = users.map(u => u.id)
  return createNotification(ids, data)
}

export async function notifyKepsek(data: NotificationData) {
  return notifyByRole(Role.KEPSEK, data)
}

export async function notifyBendahara(data: NotificationData) {
  return notifyByRole(Role.BENDAHARA, data)
}

export async function notifyUser(userId: number, data: NotificationData) {
  return createNotification([userId], data)
}
