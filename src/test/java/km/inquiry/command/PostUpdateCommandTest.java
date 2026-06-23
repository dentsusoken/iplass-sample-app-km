/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.command;

import static km.common.command.CommandTestHelper.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.iplass.mtp.auth.AuthContext;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.GenericEntity;
import org.iplass.mtp.entity.UpdateOption;
import org.iplass.mtp.test.AuthUser;
import org.iplass.mtp.test.MTPJUnitTestExtension;
import org.iplass.mtp.test.MTPTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;

@ExtendWith(MTPJUnitTestExtension.class)
@DisplayName("PostUpdateCommand")
class PostUpdateCommandTest {

	private PostUpdateCommand command;
	private RequestContext request;
	private EntityManager em;

	@BeforeEach
	void setUp() {
		command = new PostUpdateCommand();
		request = mock(RequestContext.class);
		em = mock(EntityManager.class);
	}

	@Nested
	@DisplayName("バリデーション")
	class Validation {

		@Test
		@DisplayName("内容が空の場合はVALIDATION_ERROR")
		void errorWhenContentEmpty() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("postOid")).thenReturn("post001");
			when(request.getParam("content")).thenReturn("");

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "VALIDATION_ERROR");
		}
	}

	@Nested
	@DisplayName("アクセス制御")
	class AccessControl {

		@Test
		@AuthUser(userId = "testuser", password = "testuser")
		@DisplayName("投稿の作成者以外は編集できない")
		void errorWhenNotOwner() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("postOid")).thenReturn("post001");
			when(request.getParam("content")).thenReturn("updated content");

			Entity post = createPost("post001", "other-user-oid");
			when(em.loadAndLock("post001", "km.inquiry.Post")).thenReturn(post);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "FORBIDDEN_NOT_POST_OWNER");
		}
	}

	@Nested
	@DisplayName("エラー条件")
	class ErrorConditions {

		@Test
		@DisplayName("存在しない投稿はPOST_NOT_FOUND")
		void errorWhenPostNotFound() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("postOid")).thenReturn("post999");
			when(request.getParam("content")).thenReturn("updated content");
			when(em.loadAndLock("post999", "km.inquiry.Post")).thenReturn(null);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "POST_NOT_FOUND");
		}

		@Test
		@AuthUser(userId = "testuser", password = "testuser")
		@DisplayName("存在しない問合せはINQUIRY_NOT_FOUND")
		void errorWhenInquiryNotFound() {
			MTPTest.setManagerMock(EntityManager.class, em);
			String currentUserOid = AuthContext.getCurrentContext().getUser().getOid();

			when(request.getParam("postOid")).thenReturn("post001");
			when(request.getParam("oid")).thenReturn("inq999");
			when(request.getParam("content")).thenReturn("updated content");

			Entity post = createPost("post001", currentUserOid);
			when(em.loadAndLock("post001", "km.inquiry.Post")).thenReturn(post);
			when(em.loadAndLock("inq999", "km.inquiry.Inquiry")).thenReturn(null);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "INQUIRY_NOT_FOUND");
		}
	}

	@Nested
	@DisplayName("クローズ済み問合せへの編集拒否")
	class ClosedInquiryRejection {

		@Test
		@AuthUser(userId = "testuser", password = "testuser")
		@DisplayName("Resolved状態の問合せは編集できない")
		void errorWhenInquiryResolved() {
			MTPTest.setManagerMock(EntityManager.class, em);
			String currentUserOid = AuthContext.getCurrentContext().getUser().getOid();

			when(request.getParam("postOid")).thenReturn("post001");
			when(request.getParam("oid")).thenReturn("inq001");
			when(request.getParam("content")).thenReturn("updated content");

			Entity post = createPost("post001", currentUserOid);
			when(em.loadAndLock("post001", "km.inquiry.Post")).thenReturn(post);

			Entity inquiry = createLoadedInquiry("inq001", "Resolved", "user001");
			when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "INVALID_STATUS_TRANSITION");
		}

		@Test
		@AuthUser(userId = "testuser", password = "testuser")
		@DisplayName("Canceled状態の問合せは編集できない")
		void errorWhenInquiryCanceled() {
			MTPTest.setManagerMock(EntityManager.class, em);
			String currentUserOid = AuthContext.getCurrentContext().getUser().getOid();

			when(request.getParam("postOid")).thenReturn("post001");
			when(request.getParam("oid")).thenReturn("inq001");
			when(request.getParam("content")).thenReturn("updated content");

			Entity post = createPost("post001", currentUserOid);
			when(em.loadAndLock("post001", "km.inquiry.Post")).thenReturn(post);

			Entity inquiry = createLoadedInquiry("inq001", "Canceled", "user001");
			when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "INVALID_STATUS_TRANSITION");
		}
	}

	@Nested
	@DisplayName("正常な更新")
	class SuccessfulUpdate {

		@Test
		@AuthUser(userId = "testuser", password = "testuser")
		@DisplayName("作成者は自分の投稿を更新できる")
		void successWhenOwner() {
			MTPTest.setManagerMock(EntityManager.class, em);
			String currentUserOid = AuthContext.getCurrentContext().getUser().getOid();

			when(request.getParam("postOid")).thenReturn("post001");
			when(request.getParam("oid")).thenReturn("inq001");
			when(request.getParam("content")).thenReturn("updated content");
			when(request.getParamsAsFile("attachments")).thenReturn(null);

			Entity post = createPost("post001", currentUserOid);
			when(em.loadAndLock("post001", "km.inquiry.Post")).thenReturn(post);

			Entity inquiry = createLoadedInquiry("inq001", "Open", "user001");
			when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);
			verify(em).update(any(Entity.class), any(UpdateOption.class));
		}

		@Test
		@AuthUser(userId = "testuser", password = "testuser")
		@DisplayName("添付ファイル未送信時は添付がクリアされる")
		void clearsAttachmentsWhenNoFiles() {
			MTPTest.setManagerMock(EntityManager.class, em);
			String currentUserOid = AuthContext.getCurrentContext().getUser().getOid();

			when(request.getParam("postOid")).thenReturn("post001");
			when(request.getParam("oid")).thenReturn("inq001");
			when(request.getParam("content")).thenReturn("updated content");
			when(request.getParamsAsFile("attachments")).thenReturn(null);

			Entity post = createPost("post001", currentUserOid);
			when(em.loadAndLock("post001", "km.inquiry.Post")).thenReturn(post);

			Entity inquiry = createLoadedInquiry("inq001", "Open", "user001");
			when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);

			ArgumentCaptor<Entity> entityCaptor = ArgumentCaptor.forClass(Entity.class);
			verify(em).update(entityCaptor.capture(), any(UpdateOption.class));
			assertNull(entityCaptor.getValue().getValue("attachments"));
		}
	}

	private Entity createPost(String oid, String creatorOid) {
		Entity post = new GenericEntity("km.inquiry.Post");
		post.setOid(oid);
		post.setValue("createBy", creatorOid);
		return post;
	}
}
