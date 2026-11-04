import EventKit
import Foundation

/// Native iOS calendar access for the Alfred app shell.
/// Requires NSCalendarsFullAccessUsageDescription in Info.plist and iOS 17+.
@MainActor
final class AlfredCalendarAccess {
    private let store = EKEventStore()

    struct CalendarEvent: Codable {
        let id: String
        let title: String
        let startsAt: String
        let endsAt: String
        let isAllDay: Bool
        let calendarTitle: String
        let location: String?
        let notes: String?
    }

    enum CalendarAccessError: Error {
        case permissionDenied
        case invalidDateRange
    }

    func requestPermission() async throws {
        let granted = try await store.requestFullAccessToEvents()
        guard granted else { throw CalendarAccessError.permissionDenied }
    }

    /// Returns events in the device's local calendar range.
    /// Events without a stable EventKit identifier are omitted to avoid duplicate imports.
    func events(from start: Date = .now, daysAhead: Int = 90) throws -> [CalendarEvent] {
        guard (1...365).contains(daysAhead) else {
            throw CalendarAccessError.invalidDateRange
        }

        let status = EKEventStore.authorizationStatus(for: .event)
        guard status == .fullAccess else {
            throw CalendarAccessError.permissionDenied
        }

        let end = Calendar.current.date(byAdding: .day, value: daysAhead, to: start) ?? start
        let predicate = store.predicateForEvents(withStart: start, end: end, calendars: nil)

        return store.events(matching: predicate)
            .sorted { $0.startDate < $1.startDate }
            .compactMap { event in
                guard let stableId = event.eventIdentifier ?? event.calendarItemIdentifier else {
                    return nil
                }
                return CalendarEvent(
                    id: stableId,
                    title: event.title ?? "Sem título",
                    startsAt: ISO8601DateFormatter().string(from: event.startDate),
                    endsAt: ISO8601DateFormatter().string(from: event.endDate),
                    isAllDay: event.isAllDay,
                    calendarTitle: event.calendar.title,
                    location: event.location,
                    notes: event.notes
                )
            }
    }
}
