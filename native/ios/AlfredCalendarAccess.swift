import EventKit
import Foundation

/// Native iOS calendar access for the Alfred app shell.
/// Requires NSCalendarsFullAccessUsageDescription in Info.plist and iOS 17+.
@MainActor
final class AlfredCalendarAccess {
    private let store = EKEventStore()

    struct CalendarInfo: Codable {
        let id: String
        let title: String
        let source: String
    }

    func calendars() throws -> [CalendarInfo] {
        let status = EKEventStore.authorizationStatus(for: .event)
        guard status == .fullAccess else { throw CalendarAccessError.permissionDenied }
        return store.calendars(for: .event).map { calendar in
            CalendarInfo(id: calendar.calendarIdentifier, title: calendar.title, source: calendar.source.title)
        }.sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
    }

    struct CalendarEvent: Codable {
        let id: String
        let title: String
        let startsAt: String
        let endsAt: String
        let isAllDay: Bool
        let calendarTitle: String
        let calendarId: String
        let location: String?
    }

    enum CalendarAccessError: Error {
        case permissionDenied
        case invalidDateRange
        case invalidCalendarSelection
    }

    func requestPermission() async throws {
        let granted = try await store.requestFullAccessToEvents()
        guard granted else { throw CalendarAccessError.permissionDenied }
    }

    /// Returns events in the device's local calendar range.
    /// Events without a stable EventKit identifier are omitted to avoid duplicate imports.
    func events(from start: Date = .now, daysAhead: Int = 90, calendarIds: [String]? = nil) throws -> [CalendarEvent] {
        guard (1...365).contains(daysAhead) else {
            throw CalendarAccessError.invalidDateRange
        }

        let status = EKEventStore.authorizationStatus(for: .event)
        guard status == .fullAccess else {
            throw CalendarAccessError.permissionDenied
        }

        let end = Calendar.current.date(byAdding: .day, value: daysAhead, to: start) ?? start
        let selectedCalendars: [EKCalendar]?
        if let calendarIds {
            let requestedIds = Set(calendarIds)
            let availableCalendars = store.calendars(for: .event)
            let matches = availableCalendars.filter { requestedIds.contains($0.calendarIdentifier) }
            // Never return a misleading partial/empty snapshot: the caller may use it
            // to reconcile and archive events that appear to have disappeared.
            guard !requestedIds.isEmpty, matches.count == requestedIds.count else {
                throw CalendarAccessError.invalidCalendarSelection
            }
            selectedCalendars = matches
        } else {
            selectedCalendars = nil
        }
        let predicate = store.predicateForEvents(withStart: start, end: end, calendars: selectedCalendars)

        return store.events(matching: predicate)
            .sorted { $0.startDate < $1.startDate }
            .compactMap { event in
                // calendarItemIdentifier may identify the recurring series rather than
                // this specific occurrence. Using it as a fallback would collapse
                // multiple occurrences into one imported appointment.
                guard let stableId = event.eventIdentifier else {
                    return nil
                }
                return CalendarEvent(
                    id: stableId,
                    title: event.title ?? "Sem título",
                    startsAt: ISO8601DateFormatter().string(from: event.startDate),
                    endsAt: ISO8601DateFormatter().string(from: event.endDate),
                    isAllDay: event.isAllDay,
                    calendarTitle: event.calendar.title,
                    calendarId: event.calendar.calendarIdentifier,
                    location: event.location
                )
            }
    }
}
