/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.command;

import static km.common.command.CommandTestHelper.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.GenericEntity;
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
@DisplayName("PostCreateCommand")
class PostCreateCommandTest {

	private PostCreateCommand command;
	private RequestContext request;
	private EntityManager em;

	@BeforeEach
	void setUp() {
		command = new PostCreateCommand();
		request = mock(RequestContext.class);
		em = mock(EntityManager.class);
	}

	@Nested
	@DisplayName("validation")
	class Validation {

		@Test
		@DisplayName("returns VALIDATION_ERROR when content is empty")
		void errorWhenContentEmpty() {
			try (var dao = mockEntityDaoHelper(em, false)) {
				when(request.getParam("oid")).thenReturn("inq001");
				when(request.getParam("content")).thenReturn("");

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", result);
				verifyErrorResponse(request, "VALIDATION_ERROR");
			}
		}
	}

	@Nested
	@DisplayName("error conditions")
	class ErrorConditions {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("returns INQUIRY_NOT_FOUND when inquiry does not exist")
		void errorWhenInquiryNotFound() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("oid")).thenReturn("inq999");
				when(request.getParam("content")).thenReturn("reply content");
				when(em.loadAndLock("inq999", "km.inquiry.Inquiry")).thenReturn(null);

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", result);
				verifyErrorResponse(request, "INQUIRY_NOT_FOUND");
			}
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("returns INVALID_STATUS_TRANSITION when inquiry is Resolved")
		void errorWhenInquiryResolved() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("oid")).thenReturn("inq001");
				when(request.getParam("content")).thenReturn("reply content");

				Entity inquiry = createLoadedInquiry("inq001", "Resolved", "user001");
				when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", result);
				verifyErrorResponse(request, "INVALID_STATUS_TRANSITION");
			}
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("returns INVALID_STATUS_TRANSITION when inquiry is Canceled")
		void errorWhenInquiryCanceled() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("oid")).thenReturn("inq001");
				when(request.getParam("content")).thenReturn("reply content");

				Entity inquiry = createLoadedInquiry("inq001", "Canceled", "user001");
				when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", result);
				verifyErrorResponse(request, "INVALID_STATUS_TRANSITION");
			}
		}
	}

	@Nested
	@DisplayName("status auto-transition")
	class StatusAutoTransition {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("transitions Open to Answered when responder posts, updates posts + status in one call")
		void openToAnsweredOnResponderPost() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("oid")).thenReturn("inq001");
				when(request.getParam("content")).thenReturn("Here is the answer");
				when(request.getParamsAsFile("attachments")).thenReturn(null);

				Entity inquiry = createLoadedInquiry("inq001", "Open", "user001");
				when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);
				when(em.insert(any(Entity.class))).thenReturn("post001");

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("SUCCESS", result);

				// posts と status を 1 回の update で更新したことを検証 (SelectValue)
				verify(em)
						.update(
								argThat(e -> {
									SelectValue sv = e.getValue("status");
									return "Answered".equals(sv.getValue()) && e.getValue("posts") != null;
								}),
								any(UpdateOption.class));
			}
		}

		@Test
		@AuthUser(userId = "testuser", password = "testuser")
		@DisplayName("transitions Answered to Open when user posts, updates posts + status in one call")
		void answeredToOpenOnUserPost() {
			try (var dao = mockEntityDaoHelper(em, false)) {
				when(request.getParam("oid")).thenReturn("inq001");
				when(request.getParam("content")).thenReturn("Follow-up question");
				when(request.getParamsAsFile("attachments")).thenReturn(null);

				Entity inquiry = createLoadedInquiry("inq001", "Answered", "user001");
				when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);
				when(em.insert(any(Entity.class))).thenReturn("post002");

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("SUCCESS", result);

				// posts と status を 1 回の update で更新したことを検証 (SelectValue)
				verify(em)
						.update(
								argThat(e -> {
									SelectValue sv = e.getValue("status");
									return "Open".equals(sv.getValue()) && e.getValue("posts") != null;
								}),
								any(UpdateOption.class));
			}
		}

		@Test
		@AuthUser(userId = "testuser", password = "testuser")
		@DisplayName("no status transition when user posts on Open inquiry, but still updates posts")
		void noTransitionUserOnOpen() {
			try (var dao = mockEntityDaoHelper(em, false)) {
				when(request.getParam("oid")).thenReturn("inq001");
				when(request.getParam("content")).thenReturn("Additional detail");
				when(request.getParamsAsFile("attachments")).thenReturn(null);

				Entity inquiry = createLoadedInquiry("inq001", "Open", "user001");
				when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);
				when(em.insert(any(Entity.class))).thenReturn("post004");

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("SUCCESS", result);

				// posts は常に update で追加される (status は "Open" のまま、SelectValue)
				verify(em)
						.update(
								argThat(e -> {
									SelectValue sv = e.getValue("status");
									return "Open".equals(sv.getValue()) && e.getValue("posts") != null;
								}),
								any(UpdateOption.class));
			}
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("preserves existing posts when adding a new post")
		void preservesExistingPostsOnAdd() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("oid")).thenReturn("inq001");
				when(request.getParam("content")).thenReturn("Second reply");
				when(request.getParamsAsFile("attachments")).thenReturn(null);

				Entity inquiry = createLoadedInquiry("inq001", "Open", "user001");
				Entity existingPost = new GenericEntity("km.inquiry.Post");
				existingPost.setOid("post-existing");
				inquiry.setValue("posts", new Entity[] {existingPost});
				when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);
				when(em.insert(any(Entity.class))).thenReturn("post-new");

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("SUCCESS", result);

				verify(em)
						.update(
								argThat(e -> {
									Entity[] posts = e.getValue("posts");
									return posts != null
											&& posts.length == 2
											&& "post-existing".equals(posts[0].getOid())
											&& "post-new".equals(posts[1].getOid());
								}),
								any(UpdateOption.class));
			}
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("no status transition when responder posts on Answered inquiry, but still updates posts")
		void noTransitionResponderOnAnswered() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("oid")).thenReturn("inq001");
				when(request.getParam("content")).thenReturn("Additional info");
				when(request.getParamsAsFile("attachments")).thenReturn(null);

				Entity inquiry = createLoadedInquiry("inq001", "Answered", "user001");
				when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);
				when(em.insert(any(Entity.class))).thenReturn("post003");

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("SUCCESS", result);

				// posts は常に update で追加される (status は "Answered" のまま、SelectValue)
				verify(em)
						.update(
								argThat(e -> {
									SelectValue sv = e.getValue("status");
									return "Answered".equals(sv.getValue()) && e.getValue("posts") != null;
								}),
								any(UpdateOption.class));
			}
		}
	}
}
