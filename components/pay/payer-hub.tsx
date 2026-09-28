'use client'

// components/pay/payer-hub.tsx
// A3 slice — payer home: the caller's claimed students stacked in one
// section per teacher (above each other, never tabs). Rows link to the
// frozen per-student pay screen (payScreenUrl). Copy is relationship-
// neutral: brother, uncle, sponsor, the student themselves.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { CLAIM_COPY } from '@/lib/claim-copy'
import { groupHubByTeacher, type HubStudent } from '@/lib/payer-hub'
import { payScreenUrl } from '@/lib/push-payloads'

export function PayerHub(props: { students: HubStudent[] }) {
  const sections = groupHubByTeacher(props.students)

  if (sections.length === 0) {
    return (
      <div className="mx-auto w-full max-w-md p-4" dir="rtl">
        <Card>
          <CardContent
            data-testid="hub-empty"
            className="py-8 text-center text-sm text-muted-foreground space-y-2"
          >
            <p className="font-medium text-foreground">{CLAIM_COPY.hubEmptyTitle}</p>
            <p>{CLAIM_COPY.hubEmptyDescription}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-4" dir="rtl" data-testid="payer-hub">
      <h1 className="text-lg font-bold">{CLAIM_COPY.hubTitle}</h1>
      {sections.map((section) => (
        <Card key={section.teacherId} data-testid={`hub-section-${section.teacherId}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{section.teacherName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {section.students.map((s) => (
              <Button
                key={s.studentId}
                asChild
                variant="outline"
                className="w-full justify-between"
                data-testid={`hub-student-${s.studentId}`}
              >
                {/* data-testid lives on the Button root; asChild forwards it to the anchor */}
                <a href={payScreenUrl(s.studentId)}>
                  <span>{s.studentName}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {CLAIM_COPY.hubPayButton}
                    <ChevronLeft className="h-4 w-4" />
                  </span>
                </a>
              </Button>
            ))}
          </CardContent>
        </Card>
      ))}
      <p data-testid="hub-claim-another" className="text-center text-xs text-muted-foreground">
        {CLAIM_COPY.hubClaimAnother}
      </p>
    </div>
  )
}
