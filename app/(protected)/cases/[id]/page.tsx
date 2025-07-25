"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { CaseDetailSection } from "@/components/case-detail-section"
import { EditCaseForm } from "@/components/edit-case-form"
import { AuditCaseForm } from "@/components/audit-case-form"
import { AddProcedureToCaseForm } from "@/components/add-procedure-to-case-form"
import { AttendedServicesTable } from "@/components/attended-services-table"
import { ScheduleAppointmentForm } from "@/components/schedule-appointment-form"
import { PreInvoiceDialog } from "@/components/pre-invoice-dialog"
import { DocumentUploadForm } from "@/components/document-upload-form" // Import the new component
import { FileText } from "lucide-react"

interface Service {
  name: string
  type: string
  amount: number
  attended: boolean
}

interface Document {
  name: string
  url: string
}

interface Case {
  id: string
  client: string
  date: string
  sinisterNo: string
  idNumber: string
  ciTitular: string
  ciPatient: string
  patientName: string
  patientPhone: string
  assignedAnalystId: string
  assignedAnalystName?: string
  status: string
  doctor?: string
  schedule?: string
  consultory?: string
  results?: string
  auditNotes?: string
  clinicCost?: number
  cgmServiceCost?: number
  totalInvoiceAmount?: number
  invoiceGenerated?: boolean
  creatorName?: string
  creatorEmail?: string
  creatorPhone?: string
  patientOtherPhone?: string
  patientFixedPhone?: string
  patientBirthDate?: string
  patientAge?: number
  patientGender?: string
  collective?: string
  diagnosis?: string
  provider?: string
  state?: string
  city?: string
  address?: string
  holderCI?: string
  services?: Service[]
  typeOfRequirement?: string
  baremoId?: string
  baremoName?: string
  documents?: Document[] // Add documents to Case interface
}

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditFormOpen, setIsEditFormOpen] = useState(false)
  const [isAuditFormOpen, setIsAuditFormOpen] = useState(false)
  const [isAddProcedureFormOpen, setIsAddProcedureFormOpen] = useState(false)
  const [isScheduleAppointmentFormOpen, setIsScheduleAppointmentFormOpen] = useState(false)
  const [isPreInvoiceDialogOpen, setIsPreInvoiceDialogOpen] = useState(false)
  const [isDocumentUploadFormOpen, setIsDocumentUploadFormOpen] = useState(false) // State for document upload form
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const fetchCaseData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/cases?id=${id}`)
      if (!response.ok) {
        if (response.status === 403) {
          setError("No tienes permiso para ver este caso.")
        } else {
          throw new Error(`Failed to fetch case: ${response.statusText}`)
        }
      }
      const data = await response.json()
      setCaseData(data)
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
      toast({
        title: "Error",
        description: err.message || "Failed to load case details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUserRole = async () => {
    try {
      const response = await fetch("/api/current-user-role")
      if (response.ok) {
        const data = await response.json()
        setUserRole(data.role || null)
        setUserId(data.userId || null) // Set userId here
      } else {
        console.error("Failed to fetch user role:", response.statusText)
        setUserRole(null)
        setUserId(null)
      }
    } catch (error) {
      console.error("Error fetching user role:", error)
      setUserRole(null)
      setUserId(null)
    }
  }

  useEffect(() => {
    fetchCaseData()
    fetchUserRole()
  }, [id])

  const handleUpdateCase = async (updatedFields: Partial<Case>) => {
    try {
      const response = await fetch(`/api/cases?id=${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedFields),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update case.")
      }

      const updatedCase = await response.json()
      setCaseData(updatedCase)
      toast({
        title: "Éxito",
        description: "Caso actualizado correctamente.",
        variant: "success",
      })
      setIsEditFormOpen(false)
      setIsAuditFormOpen(false)
      setIsAddProcedureFormOpen(false)
      setIsScheduleAppointmentFormOpen(false)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update case.",
        variant: "destructive",
      })
    }
  }

  const handleSaveDocuments = async (caseId: string, documents: Document[]) => {
    try {
      // The DocumentUploadForm already handles the actual file upload to /api/upload
      // and returns the URLs. So, we just need to update the case with these URLs.
      await handleUpdateCase({ documents: documents })
      toast({
        title: "Éxito",
        description: "Documentos del caso actualizados correctamente.",
        variant: "success",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar los documentos en el caso.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando caso...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>
  }

  if (!caseData) {
    return <div className="flex justify-center items-center h-screen">Caso no encontrado.</div>
  }

  const isAnalystConcertado = userRole === "Analista Concertado"
  const isMedicoAuditor = userRole === "Médico Auditor"
  const isSuperusuario = userRole === "Superusuario"
  const isCoordinadorRegional = userRole === "Coordinador Regional" // Keep this for other checks if needed

  const canEditCase = isSuperusuario || isCoordinadorRegional
  const canAuditCase = isMedicoAuditor
  const canAddProcedure = isAnalystConcertado || isSuperusuario || isCoordinadorRegional
  const canScheduleAppointment = isAnalystConcertado || isSuperusuario || isCoordinadorRegional
  const canGeneratePreInvoiceGlobally = isSuperusuario || isCoordinadorRegional // Keep this for other uses if needed

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Detalles del Caso: {caseData.patientName}</h1>
        <div className="ml-auto flex gap-2">
          {canEditCase && (
            <Button onClick={() => setIsEditFormOpen(true)} className="bg-blue-500 hover:bg-blue-600 text-white">
              Editar Caso
            </Button>
          )}
          {canAuditCase && (
            <Button onClick={() => setIsAuditFormOpen(true)} className="bg-purple-500 hover:bg-purple-600 text-white">
              Auditar Caso
            </Button>
          )}
          {canAddProcedure && (
            <Button
              onClick={() => setIsAddProcedureFormOpen(true)}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Añadir Procedimiento
            </Button>
          )}
          {canScheduleAppointment && (
            <Button
              onClick={() => setIsScheduleAppointmentFormOpen(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              Agendar Cita
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="services">Servicios Atendidos</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger> {/* New tab for documents */}
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Información General del Caso</CardTitle>
            </CardHeader>
            <CardContent>
              <CaseDetailSection caseData={caseData} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Servicios Atendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendedServicesTable
                services={caseData.services || []}
                baremoId={caseData.baremoId || null}
                caseId={caseData.id}
                onUpdateServices={(updatedServices) => {
                  setCaseData((prev) => (prev ? { ...prev, services: updatedServices } : null))
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Notas de Auditoría y Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div>
                  <h3 className="font-semibold">Resultados:</h3>
                  <p className="text-muted-foreground">{caseData.results || "N/A"}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Notas de Auditoría:</h3>
                  <p className="text-muted-foreground">{caseData.auditNotes || "N/A"}</p>
                </div>
                <div className="flex gap-2 mt-4">
                  {" "}
                  {/* New div for buttons */}
                  {(isSuperusuario || (isAnalystConcertado && caseData.assignedAnalystId === userId)) && (
                    <Button
                      onClick={() => setIsDocumentUploadFormOpen(true)}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Subir informe medico y resultados
                    </Button>
                  )}
                  {(isSuperusuario || isCoordinadorRegional) && (
                    <Button
                      onClick={() => setIsPreInvoiceDialogOpen(true)}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white"
                    >
                      Subir prefactura
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documentos del Caso</CardTitle>
            </CardHeader>
            <CardContent>
              {caseData.documents && caseData.documents.length > 0 ? (
                <ul className="space-y-2">
                  {caseData.documents.map((doc, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {doc.name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No hay documentos subidos para este caso.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historial del Caso</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Funcionalidad de historial aún no implementada.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {isEditFormOpen && caseData && (
          <EditCaseForm
            isOpen={isEditFormOpen}
            onClose={() => setIsEditFormOpen(false)}
            onSave={handleUpdateCase}
            initialData={caseData}
          />
        )}

        {isAuditFormOpen && caseData && (
          <AuditCaseForm
            isOpen={isAuditFormOpen}
            onClose={() => setIsAuditFormOpen(false)}
            onSave={handleUpdateCase}
            initialData={caseData}
          />
        )}

        {isAddProcedureFormOpen && caseData && (
          <AddProcedureToCaseForm
            isOpen={isAddProcedureFormOpen}
            onClose={() => setIsAddProcedureFormOpen(false)}
            onSave={handleUpdateCase}
            caseId={caseData.id}
            currentServices={caseData.services || []}
            baremoId={caseData.baremoId || ""}
          />
        )}

        {isScheduleAppointmentFormOpen && caseData && (
          <ScheduleAppointmentForm
            isOpen={isScheduleAppointmentFormOpen}
            onClose={() => setIsScheduleAppointmentFormOpen(false)}
            onSave={handleUpdateCase}
            initialData={caseData}
          />
        )}

        {isPreInvoiceDialogOpen && caseData && (
          <DocumentUploadForm
            isOpen={isPreInvoiceDialogOpen}
            onClose={() => setIsPreInvoiceDialogOpen(false)}
            caseId={caseData.id}
            onSave={handleSaveDocuments}
            initialDocuments={caseData.documents || []}
          />
        )}

        {isDocumentUploadFormOpen && caseData && (
          <DocumentUploadForm
            isOpen={isDocumentUploadFormOpen}
            onClose={() => setIsDocumentUploadFormOpen(false)}
            onSave={handleSaveDocuments}
            caseId={caseData.id}
            initialDocuments={caseData.documents || []}
          />
        )}
      </Tabs>
    </main>
  )
}