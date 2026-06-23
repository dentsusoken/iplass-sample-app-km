/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.command;

import static km.common.command.CommandTestHelper.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.SelectValue;
import org.iplass.mtp.entity.UpdateOption;
import org.iplass.mtp.test.AuthUser;
import org.iplass.mtp.test.MTPJUnitTestExtension;
import org.iplass.mtp.test.MTPTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(MTPJUnitTestExtension.class)
@DisplayName("InquiryStatusCommand")
class InquiryStatusCommandTest {

	private InquiryStatusCommand command;
	private RequestContext request;
	private EntityManager em;

	@BeforeEach
	void setUp() {
		command = new InquiryStatusCommand();
		request = mock(RequestContext.class);
		em = mock(EntityManager.class);
	}

	@Nested
	@DisplayName("close operation")
	class CloseOperation {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("closes Open inquiry as Resolved")
		void closesOpenAsResolved() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq001");
			when(request.getParam("resolution")).thenReturn("resolved");
			when(request.getAttribute("webApiName")).thenReturn("km/inquiry/close");

			Entity inquiry = createLoadedInquiry("inq001", "Open", "user001");
			when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);
			verify(em)
					.update(
							argThat(e -> "inq001".equals(e.getOid())
									&& "Resolved".equals(((SelectValue) e.getValue("status")).getValue())
									&& e.getValue("closedDate") != null),
							any(UpdateOption.class));
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("closes Open inquiry as Canceled")
		void closesOpenAsCanceled() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq001");
			when(request.getParam("resolution")).thenReturn("canceled");
			when(request.getAttribute("webApiName")).thenReturn("km/inquiry/close");

			Entity inquiry = createLoadedInquiry("inq001", "Open", "user001");
			when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);
			verify(em)
					.update(
							argThat(e -> "inq001".equals(e.getOid())
									&& "Canceled".equals(((SelectValue) e.getValue("status")).getValue())),
							any(UpdateOption.class));
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("closes Answered inquiry as Canceled")
		void closesAnsweredAsCanceled() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq001");
			when(request.getParam("resolution")).thenReturn("canceled");
			when(request.getAttribute("webApiName")).thenReturn("km/inquiry/close");

			Entity inquiry = createLoadedInquiry("inq001", "Answered", "user001");
			when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);
			verify(em)
					.update(
							argThat(e -> "inq001".equals(e.getOid())
									&& "Canceled".equals(((SelectValue) e.getValue("status")).getValue())),
							any(UpdateOption.class));
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("closes Answered inquiry as Resolved")
		void closesAnsweredAsResolved() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq001");
			when(request.getParam("resolution")).thenReturn("resolved");
			when(request.getAttribute("webApiName")).thenReturn("km/inquiry/close");

			Entity inquiry = createLoadedInquiry("inq001", "Answered", "user001");
			when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);
			verify(em)
					.update(
							argThat(e -> "inq001".equals(e.getOid())
									&& "Resolved".equals(((SelectValue) e.getValue("status")).getValue())),
							any(UpdateOption.class));
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("returns INVALID_STATUS_TRANSITION when closing a Resolved inquiry")
		void errorWhenClosingResolved() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq001");
			when(request.getParam("resolution")).thenReturn("resolved");
			when(request.getAttribute("webApiName")).thenReturn("km/inquiry/close");

			Entity inquiry = createLoadedInquiry("inq001", "Resolved", "user001");
			when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "INVALID_STATUS_TRANSITION");
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("returns VALIDATION_ERROR when resolution is missing")
		void errorWhenResolutionMissing() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq001");
			when(request.getParam("resolution")).thenReturn(null);
			when(request.getAttribute("webApiName")).thenReturn("km/inquiry/close");

			Entity inquiry = createLoadedInquiry("inq001", "Open", "user001");
			when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "VALIDATION_ERROR");
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("returns VALIDATION_ERROR for invalid resolution value")
		void errorWhenResolutionInvalid() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq001");
			when(request.getParam("resolution")).thenReturn("invalid");
			when(request.getAttribute("webApiName")).thenReturn("km/inquiry/close");

			Entity inquiry = createLoadedInquiry("inq001", "Open", "user001");
			when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "VALIDATION_ERROR");
		}
	}

	@Nested
	@DisplayName("reopen operation")
	class ReopenOperation {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("reopens Resolved inquiry to Open")
		void reopensResolved() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq001");
			when(request.getAttribute("webApiName")).thenReturn("km/inquiry/reopen");

			Entity inquiry = createLoadedInquiry("inq001", "Resolved", "user001");
			when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);
			verify(em)
					.update(
							argThat(e -> "inq001".equals(e.getOid())
									&& "Open".equals(((SelectValue) e.getValue("status")).getValue())
									&& e.getValue("closedDate") == null),
							any(UpdateOption.class));
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("reopens Canceled inquiry to Open")
		void reopensCanceled() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq001");
			when(request.getAttribute("webApiName")).thenReturn("km/inquiry/reopen");

			Entity inquiry = createLoadedInquiry("inq001", "Canceled", "user001");
			when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);
			verify(em)
					.update(
							argThat(e -> "inq001".equals(e.getOid())
									&& "Open".equals(((SelectValue) e.getValue("status")).getValue())),
							any(UpdateOption.class));
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("returns INVALID_STATUS_TRANSITION when reopening an Answered inquiry")
		void errorWhenReopeningAnswered() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq001");
			when(request.getAttribute("webApiName")).thenReturn("km/inquiry/reopen");

			Entity inquiry = createLoadedInquiry("inq001", "Answered", "user001");
			when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "INVALID_STATUS_TRANSITION");
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("returns INVALID_STATUS_TRANSITION when reopening an Open inquiry")
		void errorWhenReopeningOpen() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq001");
			when(request.getAttribute("webApiName")).thenReturn("km/inquiry/reopen");

			Entity inquiry = createLoadedInquiry("inq001", "Open", "user001");
			when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "INVALID_STATUS_TRANSITION");
		}
	}

	@Nested
	@DisplayName("access control")
	class AccessControl {

		@Test
		@AuthUser(userId = "testuser", password = "testuser")
		@DisplayName("non-responder user can close inquiry")
		void nonResponderCanCloseInquiry() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq001");
			when(request.getParam("resolution")).thenReturn("resolved");
			when(request.getAttribute("webApiName")).thenReturn("km/inquiry/close");

			Entity inquiry = createLoadedInquiry("inq001", "Open", "user001");
			when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("returns INQUIRY_NOT_FOUND when inquiry does not exist")
		void errorWhenNotFound() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("inq999");
			when(request.getAttribute("webApiName")).thenReturn("km/inquiry/close");
			when(em.loadAndLock("inq999", "km.inquiry.Inquiry")).thenReturn(null);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "INQUIRY_NOT_FOUND");
		}
	}
}
