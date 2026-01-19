# SWR Hooks Usage Guide

This directory contains SWR hooks for data fetching with automatic caching, revalidation, and loading states.

## Available Hooks

### Clients
```typescript
import { useClients, useClient } from '@/hooks/use-clients'

// Get all clients
const { clients, isLoading, isError, mutate } = useClients()

// Get single client
const { client, isLoading, isError, mutate } = useClient(clientId)
```

### Invoices
```typescript
import { useInvoices, useInvoice, useUnpaidAmounts } from '@/hooks/use-invoices'

// Get all invoices
const { invoices, isLoading, isError, mutate } = useInvoices()

// Get single invoice
const { invoice, isLoading, isError, mutate } = useInvoice(invoiceId)

// Get unpaid amounts
const { unpaidAmounts, isLoading, isError, mutate } = useUnpaidAmounts()
```

### Projects
```typescript
import { useProjects, useProject } from '@/hooks/use-projects'

// Get all projects
const { projects, isLoading, isError, mutate } = useProjects()

// Get single project
const { project, isLoading, isError, mutate } = useProject(projectId)
```

### Notifications
```typescript
import { useNotifications, useUnreadCount } from '@/hooks/use-notifications'

// Get notifications (auto-polls every 30s for unread count)
const { notifications, isLoading, isError, mutate } = useNotifications(10)

// Get unread count only
const { count, isLoading, isError, mutate } = useUnreadCount()
```

### Feedback
```typescript
import { useFeedbacks, useFeedback, useUserUnreadCount } from '@/hooks/use-feedback'

// Get all feedbacks
const { feedbacks, isLoading, isError, mutate } = useFeedbacks()

// Get single feedback
const { feedback, isLoading, isError, mutate } = useFeedback(feedbackId)

// Get user unread count (auto-polls every 30s)
const { count, isLoading, isError, mutate } = useUserUnreadCount()
```

### Accounting
```typescript
import { useRevenues, useExpenses } from '@/hooks/use-accounting'

// Get revenues
const { revenues, isLoading, isError, mutate } = useRevenues()

// Get expenses
const { expenses, isLoading, isError, mutate } = useExpenses()
```

## Mutations with Optimistic Updates

### Example: Create Client
```typescript
import { useClients } from '@/hooks/use-clients'
import { toast } from 'sonner'

function CreateClientForm() {
  const { clients, mutate } = useClients()

  const handleSubmit = async (data) => {
    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const optimisticClient = { id: tempId, ...data, _count: { invoices: 0 } }

    mutate([optimisticClient, ...(clients || [])], false)

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Failed to create client')

      const newClient = await response.json()

      // Update with real data
      mutate()
      toast.success('Client créé avec succès')
    } catch (error) {
      // Rollback on error
      mutate()
      toast.error('Erreur lors de la création du client')
    }
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

### Example: Update Invoice
```typescript
import { useInvoice } from '@/hooks/use-invoices'
import { toast } from 'sonner'

function EditInvoiceForm({ invoiceId }) {
  const { invoice, mutate } = useInvoice(invoiceId)

  const handleUpdate = async (updates) => {
    // Optimistic update
    mutate({ ...invoice, ...updates }, false)

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error('Failed to update')

      mutate()
      toast.success('Facture mise à jour')
    } catch (error) {
      mutate() // Rollback
      toast.error('Erreur lors de la mise à jour')
    }
  }

  return <form onSubmit={handleUpdate}>...</form>
}
```

### Example: Delete with Optimistic Update
```typescript
import { useClients } from '@/hooks/use-clients'
import { toast } from 'sonner'

function ClientList() {
  const { clients, mutate } = useClients()

  const handleDelete = async (clientId: string) => {
    // Optimistic delete
    const filteredClients = clients?.filter(c => c.id !== clientId)
    mutate(filteredClients, false)

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      mutate()
      toast.success('Client supprimé')
    } catch (error) {
      mutate() // Rollback
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div>
      {clients?.map(client => (
        <div key={client.id}>
          {client.name}
          <button onClick={() => handleDelete(client.id)}>Delete</button>
        </div>
      ))}
    </div>
  )
}
```

## Loading and Error States

```typescript
function ClientsPage() {
  const { clients, isLoading, isError } = useClients()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (isError) {
    return <div>Error loading clients</div>
  }

  return (
    <div>
      {clients?.map(client => (
        <div key={client.id}>{client.name}</div>
      ))}
    </div>
  )
}
```

## Manual Revalidation

```typescript
function RefreshButton() {
  const { mutate } = useClients()

  return (
    <button onClick={() => mutate()}>
      Refresh Clients
    </button>
  )
}
```

## Benefits of SWR

1. **Automatic Caching**: Data is cached and reused across components
2. **Automatic Revalidation**: Data refreshes on focus, reconnect, or interval
3. **Optimistic Updates**: Update UI immediately before server confirms
4. **Deduplication**: Multiple requests for same data are deduplicated
5. **Loading States**: Built-in loading and error states
6. **Type Safety**: Full TypeScript support with typed responses
